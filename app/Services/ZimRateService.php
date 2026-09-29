<?php

namespace App\Services;

use App\Models\ExchangeRate;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class ZimRateService
{
    private const CACHE_KEY = 'zimrate.latest.usd-zwg-zar';

    /**
     * Return the latest USD rates for ZiG and the South African rand.
     *
     * @return array<int, array<string, bool|float|string|null>>
     */
    public function latestForDashboard(): array
    {
        try {
            return Cache::remember(
                self::CACHE_KEY,
                now()->addSeconds(max(60, (int) config('services.zimrate.cache_ttl', 1800))),
                fn (): array => $this->fetchLatest()
            );
        } catch (Throwable $exception) {
            Log::warning('ZimRate exchange-rate feed is unavailable; using approved local rates.', [
                'exception' => $exception->getMessage(),
            ]);

            return $this->approvedLocalRates();
        }
    }

    /**
     * @return array<int, array<string, bool|float|string|null>>
     */
    private function fetchLatest(): array
    {
        $baseUrl = rtrim((string) config('services.zimrate.base_url', 'https://zimrate.com'), '/');
        $payload = Http::acceptJson()
            ->timeout((int) config('services.zimrate.timeout', 6))
            ->retry(2, 200)
            ->get("{$baseUrl}/api/rates/latest")
            ->throw()
            ->json();

        if (! is_array($payload)) {
            throw new RuntimeException('ZimRate returned an invalid response.');
        }

        $rates = collect($payload)
            ->filter(fn (mixed $rate): bool => is_array($rate)
                && is_string($rate['currencyPair'] ?? null)
                && is_numeric($rate['buyRate'] ?? null)
                && data_get($rate, 'source.active', true) !== false);

        $requestedPairs = [
            ['quote' => 'ZWG', 'label' => 'ZiG', 'aliases' => ['USD/ZWG', 'USD/ZiG']],
            ['quote' => 'ZAR', 'label' => 'Rand', 'aliases' => ['USD/ZAR']],
        ];

        $result = collect($requestedPairs)
            ->map(function (array $requestedPair) use ($rates): ?array {
                $candidate = $rates
                    ->filter(fn (array $rate): bool => in_array($rate['currencyPair'], $requestedPair['aliases'], true))
                    ->sort(fn (array $left, array $right): int => $this->candidateScore($right, $requestedPair['aliases']) <=> $this->candidateScore($left, $requestedPair['aliases']))
                    ->first();

                if (! is_array($candidate)) {
                    return null;
                }

                return [
                    'base' => 'USD',
                    'quote' => $requestedPair['quote'],
                    'quote_label' => $requestedPair['label'],
                    'buy_rate' => (float) $candidate['buyRate'],
                    'sell_rate' => is_numeric($candidate['sellRate'] ?? null) ? (float) $candidate['sellRate'] : null,
                    'source' => (string) data_get($candidate, 'source.name', 'ZimRate'),
                    'source_type' => (string) data_get($candidate, 'source.type', 'market'),
                    'updated_at' => (string) ($candidate['scrapedAt'] ?? now()->toIso8601String()),
                    'is_fallback' => false,
                ];
            })
            ->filter()
            ->values()
            ->all();

        if ($result === []) {
            throw new RuntimeException('ZimRate did not return USD/ZiG or USD/ZAR rates.');
        }

        return $result;
    }

    /**
     * Prefer the ISO ZiG pair, then official API sources, then the freshest rate.
     *
     * @param  array<int, string>  $aliases
     * @return array<int, int>
     */
    private function candidateScore(array $rate, array $aliases): array
    {
        $aliasIndex = array_search($rate['currencyPair'], $aliases, true);
        $sourceType = (string) data_get($rate, 'source.type', '');

        return [
            $aliasIndex === false ? 0 : count($aliases) - $aliasIndex,
            match ($sourceType) {
                'official_api' => 3,
                'official' => 2,
                'bank' => 1,
                default => 0,
            },
            strtotime((string) ($rate['scrapedAt'] ?? '')) ?: 0,
        ];
    }

    /**
     * @return array<int, array<string, bool|float|string|null>>
     */
    private function approvedLocalRates(): array
    {
        return ExchangeRate::query()
            ->where('base_currency', 'USD')
            ->whereIn('quote_currency', ['ZWG', 'ZAR'])
            ->whereNotNull('approved_at')
            ->latest('rate_date')
            ->latest('approved_at')
            ->get()
            ->unique('quote_currency')
            ->sortBy(fn (ExchangeRate $rate): int => $rate->quote_currency === 'ZWG' ? 0 : 1)
            ->values()
            ->map(fn (ExchangeRate $rate): array => [
                'base' => 'USD',
                'quote' => $rate->quote_currency,
                'quote_label' => $rate->quote_currency === 'ZWG' ? 'ZiG' : 'Rand',
                'buy_rate' => (float) $rate->rate,
                'sell_rate' => null,
                'source' => $rate->source,
                'source_type' => 'approved_local',
                'updated_at' => $rate->rate_date->toDateString(),
                'is_fallback' => true,
            ])
            ->all();
    }
}
