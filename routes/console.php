<?php

use App\Models\AuditEvent;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\User;
use App\Services\AuditTrailService;
use App\Services\CallCentreAutomationService;
use App\Services\PaymentReceiptService;
use App\Services\SalesLifecycleService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('call-centre:process', function (CallCentreAutomationService $automation) {
    $this->info(json_encode($automation->run(), JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
})->purpose('Generate call-centre reminders, reconcile promises and escalate overdue work');

Schedule::command('call-centre:process')->everyFifteenMinutes()->withoutOverlapping();

Artisan::command('accounting:recurring-sales', function (SalesLifecycleService $sales) {
    $count = 0;
    Organization::query()->each(function (Organization $organization) use ($sales, &$count): void {
        $user = User::query()->where('organization_id', $organization->id)->where('status', 'active')->oldest('id')->first();
        if ($user) {
            $count += $sales->generateRecurring($user);
        }
    });
    $this->info("{$count} recurring sales document(s) generated.");
})->purpose('Generate due recurring invoices and debit notes');

Schedule::command('accounting:recurring-sales')->dailyAt('00:20')->withoutOverlapping();

Artisan::command('payments:backfill-receipts', function (PaymentReceiptService $receipts) {
    $created = 0;
    Payment::query()
        ->where('status', 'approved')
        ->whereDoesntHave('receipt')
        ->with(['approver', 'maker'])
        ->orderBy('id')
        ->each(function (Payment $payment) use ($receipts, &$created): void {
            $issuer = $payment->approver ?? $payment->maker;
            if (! $issuer) {
                return;
            }
            $request = Request::create('/console/payments/backfill-receipts', 'POST');
            $request->setUserResolver(fn () => $issuer);
            $receipts->issue($payment, $issuer, $request);
            $created++;
        });
    $this->info("{$created} missing receipt(s) issued.");
})->purpose('Issue POS receipts for historical approved payments that do not yet have one');

Artisan::command('audit:verify', function (AuditTrailService $audit): int {
    $failed = false;
    Organization::query()->each(function (Organization $organization) use ($audit, &$failed): void {
        $result = $audit->verifyOrganization($organization->id);
        if (! $result['valid']) {
            $failed = true;
            Log::critical('Audit-chain verification failed.', ['organization_id' => $organization->id, ...$result]);
            $this->error("Audit chain failed for {$organization->code}: {$result['issues']} issue(s).");
        }
        $anchorUrl = config('services.audit.anchor_url');
        $anchorSecret = config('services.audit.anchor_secret');
        if ($result['valid'] && $anchorUrl && $anchorSecret) {
            $latest = AuditEvent::query()->where('organization_id', $organization->id)->latest('id')->first();
            $payload = ['organization_id' => $organization->id, 'event_id' => $latest?->id, 'event_hash' => $latest?->event_hash, 'verified_at' => now()->toIso8601String()];
            Http::timeout(10)->withHeaders(['X-Audit-Signature' => hash_hmac('sha256', json_encode($payload, JSON_THROW_ON_ERROR), $anchorSecret)])->post($anchorUrl, $payload)->throw();
        }
    });

    return $failed ? 1 : 0;
})->purpose('Verify every organization audit chain and publish an optional signed external anchor');

Schedule::command('audit:verify')->dailyAt('02:00')->withoutOverlapping();
