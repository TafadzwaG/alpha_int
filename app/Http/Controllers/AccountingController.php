<?php

namespace App\Http\Controllers;

use App\Services\AccountingService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AccountingController extends Controller
{
    public function __construct(private readonly AccountingService $accounting) {}

    public function index(Request $request): Response
    {
        return Inertia::render('accounting/index', $this->accounting->dashboard($request->user()));
    }

    public function debtors(Request $request): Response
    {
        $receivables = $this->accounting->receivables($request->user());
        $search = trim((string) $request->string('search'));
        $bucket = (string) $request->string('bucket');
        $validBuckets = collect(AccountingService::BUCKETS)->pluck('key');
        if (! $validBuckets->contains($bucket)) {
            $bucket = '';
        }

        $debtors = $receivables['debtors']
            ->when($search !== '', function ($rows) use ($search) {
                $needle = Str::lower($search);

                return $rows->filter(fn (array $debtor): bool => collect([
                    $debtor['client'],
                    $debtor['client_no'],
                    $debtor['account_no'],
                    $debtor['branch'],
                    $debtor['phone'],
                ])->filter()->contains(fn (string $value): bool => str_contains(Str::lower($value), $needle)));
            })
            ->when($bucket !== '', fn ($rows) => $rows->filter(fn (array $debtor): bool => $debtor['aging'][$bucket] > 0))
            ->values();

        $page = max(1, (int) $request->integer('page', 1));
        $perPage = 15;
        $paginator = new LengthAwarePaginator(
            $debtors->forPage($page, $perPage)->values(),
            $debtors->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return Inertia::render('accounting/debtors', [
            'summary' => $receivables['summary'],
            'aging' => $receivables['aging'],
            'currency' => $receivables['currency'],
            'debtors' => $paginator,
            'filters' => ['search' => $search, 'bucket' => $bucket],
        ]);
    }
}
