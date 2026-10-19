<?php

namespace App\Services;

use App\Models\ExchangeRate;
use Carbon\CarbonInterface;
use RuntimeException;

class CurrencyConversionService
{
    /** @var array<string, float> */
    private array $rates = [];

    public function convert(float $amount, string $currency, string $baseCurrency, CarbonInterface|string|null $date = null): float
    {
        if ($currency === $baseCurrency) {
            return $amount;
        }

        $on = $date instanceof CarbonInterface ? $date->toDateString() : (string) ($date ?: today()->toDateString());
        $key = "{$currency}:{$baseCurrency}:{$on}";
        $rate = $this->rates[$key] ??= $this->rate($currency, $baseCurrency, $on);

        return round($amount * $rate, 4);
    }

    private function rate(string $currency, string $baseCurrency, string $date): float
    {
        $direct = ExchangeRate::query()->where('base_currency', $currency)->where('quote_currency', $baseCurrency)
            ->whereNotNull('approved_at')->whereDate('rate_date', '<=', $date)->latest('rate_date')->value('rate');
        if ($direct) {
            return (float) $direct;
        }

        $inverse = ExchangeRate::query()->where('base_currency', $baseCurrency)->where('quote_currency', $currency)
            ->whereNotNull('approved_at')->whereDate('rate_date', '<=', $date)->latest('rate_date')->value('rate');
        if ($inverse && (float) $inverse !== 0.0) {
            return 1 / (float) $inverse;
        }

        throw new RuntimeException("No approved {$currency}/{$baseCurrency} exchange rate exists on or before {$date}.");
    }
}
