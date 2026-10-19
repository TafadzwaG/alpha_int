<?php

namespace App\Providers;

use App\Models\AccountCharge;
use App\Models\BankDeposit;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Services\DailyAccountingService;
use App\Services\SourceDocumentPostingService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        AccountCharge::saved(fn (AccountCharge $charge) => app(SourceDocumentPostingService::class)->postCharge($charge));
        Payment::saved(function (Payment $payment): void {
            app(SourceDocumentPostingService::class)->postPayment($payment);
            $payment->allocations()->get()->each(fn (PaymentAllocation $allocation) => app(DailyAccountingService::class)->syncInvoiceForAllocation($allocation));
        });
        Expense::saved(fn (Expense $expense) => app(SourceDocumentPostingService::class)->postExpense($expense));
        BankDeposit::saved(fn (BankDeposit $deposit) => app(SourceDocumentPostingService::class)->postBankDeposit($deposit));
        PaymentAllocation::saved(fn (PaymentAllocation $allocation) => app(DailyAccountingService::class)->syncInvoiceForAllocation($allocation));
        PaymentAllocation::deleted(fn (PaymentAllocation $allocation) => app(DailyAccountingService::class)->syncInvoiceForAllocation($allocation));
    }
}
