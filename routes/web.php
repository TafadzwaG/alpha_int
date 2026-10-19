<?php

use App\Http\Controllers\AccountingControlCentreController;
use App\Http\Controllers\AccountingController;
use App\Http\Controllers\AccountingDailyActivityController;
use App\Http\Controllers\AccountingMasterDataController;
use App\Http\Controllers\AccountingPayablesController;
use App\Http\Controllers\AdministrationController;
use App\Http\Controllers\AllocationPaymentController;
use App\Http\Controllers\ApprovalRequestController;
use App\Http\Controllers\AuditEventController;
use App\Http\Controllers\BranchOperationsController;
use App\Http\Controllers\BranchSelectionController;
use App\Http\Controllers\CallCentreCampaignController;
use App\Http\Controllers\CallCentreController;
use App\Http\Controllers\CallCentreReportController;
use App\Http\Controllers\ClientBulkSmsController;
use App\Http\Controllers\ClientDocumentController;
use App\Http\Controllers\ClientInteractionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FollowUpTaskController;
use App\Http\Controllers\GapWorkbookExportController;
use App\Http\Controllers\GapWorkbookImportController;
use App\Http\Controllers\GlobalSearchController;
use App\Http\Controllers\InstallmentController;
use App\Http\Controllers\InstallmentReminderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PaymentDetailsController;
use App\Http\Controllers\PaymentReversalController;
use App\Http\Controllers\PhaseOneResourceController;
use App\Http\Controllers\PromiseToPayController;
use App\Http\Controllers\PropertyOperationsController;
use App\Http\Controllers\ReadinessController;
use App\Http\Controllers\ReceiptRegisterController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StandLegalCaseController;
use App\Http\Controllers\StandMapController;
use App\Http\Controllers\SupplierReconciliationController;
use App\Http\Controllers\TaxReportController;
use App\Http\Controllers\TwilioWebhookController;
use App\Http\Controllers\UserAdministrationController;
use App\Services\FinanceRegister;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');
Route::get('/health/ready', ReadinessController::class)->middleware('throttle:30,1')->name('health.ready');

Route::post('/webhooks/twilio/status', [TwilioWebhookController::class, 'status'])->middleware('throttle:120,1')->name('webhooks.twilio.status');
Route::post('/webhooks/twilio/inbound', [TwilioWebhookController::class, 'inbound'])->middleware('throttle:120,1')->name('webhooks.twilio.inbound');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/global-search', GlobalSearchController::class)->middleware('throttle:60,1')->name('global-search');
    Route::get('select-branch', [BranchSelectionController::class, 'index'])->name('branch-selection.index');
    Route::post('select-branch', [BranchSelectionController::class, 'store'])->name('branch-selection.store');
    Route::post('impersonation/leave', [UserAdministrationController::class, 'leaveImpersonation'])->name('impersonation.leave');

    Route::get('dashboard', [DashboardController::class, 'index'])->middleware('branch.selected')->name('dashboard');

    Route::middleware(['permission:call-centre.view', 'branch.selected'])->prefix('call-centre')->name('call-centre.')->group(function () {
        Route::get('/', [CallCentreController::class, 'index'])->name('index');
        Route::get('/queue', [FollowUpTaskController::class, 'index'])->name('queue');
        Route::post('/tasks/bulk-assign', [FollowUpTaskController::class, 'bulkAssign'])->name('tasks.bulk-assign');
        Route::patch('/tasks/{followUpTask}', [FollowUpTaskController::class, 'update'])->name('tasks.update');
        Route::get('/clients/{client}', [CallCentreController::class, 'client'])->name('clients.show');
        Route::post('/clients/{client}/interactions', [ClientInteractionController::class, 'store'])->name('clients.interactions.store');
        Route::post('/clients/{client}/tasks', [FollowUpTaskController::class, 'store'])->name('clients.tasks.store');
        Route::patch('/promises/{promiseToPay}', [PromiseToPayController::class, 'update'])->name('promises.update');
        Route::get('/campaigns', [CallCentreCampaignController::class, 'index'])->name('campaigns.index');
        Route::post('/campaigns', [CallCentreCampaignController::class, 'store'])->name('campaigns.store');
        Route::post('/campaigns/{campaign}/generate', [CallCentreCampaignController::class, 'generate'])->name('campaigns.generate');
        Route::patch('/campaigns/{campaign}/status', [CallCentreCampaignController::class, 'updateStatus'])->name('campaigns.status');
        Route::middleware('permission:call-centre.campaigns.manage')->group(function () {
            Route::get('/bulk-sms', [ClientBulkSmsController::class, 'index'])->name('bulk-sms.index');
            Route::post('/bulk-sms', [ClientBulkSmsController::class, 'store'])->name('bulk-sms.store');
        });
        Route::middleware('permission:call-centre.reports.view')->group(function () {
            Route::get('/reports', [CallCentreReportController::class, 'index'])->name('reports.index');
            Route::get('/reports/export/pdf', [CallCentreReportController::class, 'pdf'])->name('reports.pdf');
            Route::get('/reports/export/excel', [CallCentreReportController::class, 'excel'])->name('reports.excel');
        });
        Route::patch('/notifications/{notification}/read', [CallCentreController::class, 'readNotification'])->name('notifications.read');
    });

    Route::middleware('permission:phase-one.view')->group(function () {
        Route::get('approvals', [ApprovalRequestController::class, 'index'])->name('approvals.index');
        Route::post('approvals/{approvalRequest}/decision', [ApprovalRequestController::class, 'decide'])->name('approvals.decision');
        Route::get('reports', [ReportController::class, 'index'])->middleware('permission:reports.view')->name('reports.index');
        Route::get('reports/export/pdf', [ReportController::class, 'pdf'])->middleware('permission:reports.view')->name('reports.export.pdf');
        Route::get('reports/export/excel', [ReportController::class, 'excel'])->middleware('permission:reports.view')->name('reports.export.excel');
        Route::middleware(['permission:accounting.view', 'branch.selected'])->prefix('accounting')->name('accounting.')->group(function () {
            Route::get('/', [AccountingController::class, 'index'])->name('index');
            Route::get('/control-centre', [AccountingControlCentreController::class, 'index'])->name('control-centre');
            Route::post('/sales-documents', [AccountingControlCentreController::class, 'storeSalesDocument'])->name('sales-documents.store');
            Route::post('/sales-documents/recurring/generate', [AccountingControlCentreController::class, 'generateRecurring'])->name('sales-documents.recurring.generate');
            Route::post('/sales-documents/{salesDocument}/submit', [AccountingControlCentreController::class, 'submitSalesDocument'])->name('sales-documents.submit');
            Route::post('/sales-documents/{salesDocument}/approve', [AccountingControlCentreController::class, 'approveSalesDocument'])->name('sales-documents.approve');
            Route::post('/sales-documents/{salesDocument}/post', [AccountingControlCentreController::class, 'postSalesDocument'])->name('sales-documents.post');
            Route::post('/sales-documents/{salesDocument}/convert', [AccountingControlCentreController::class, 'convertSalesDocument'])->name('sales-documents.convert');
            Route::post('/bank-rules', [AccountingControlCentreController::class, 'storeBankRule'])->name('bank-rules.store');
            Route::post('/bank-reconciliations', [AccountingControlCentreController::class, 'storeBankReconciliation'])->name('bank-reconciliations.store');
            Route::post('/bank-reconciliations/{bankReconciliation}/rules', [AccountingControlCentreController::class, 'applyBankRules'])->name('bank-reconciliations.rules');
            Route::post('/bank-reconciliations/{bankReconciliation}/review', [AccountingControlCentreController::class, 'reviewBankReconciliation'])->name('bank-reconciliations.review');
            Route::post('/bank-reconciliations/{bankReconciliation}/approve', [AccountingControlCentreController::class, 'approveBankReconciliation'])->name('bank-reconciliations.approve');
            Route::get('/bank-reconciliations/{bankReconciliation}/export/{format}', [AccountingControlCentreController::class, 'exportBankReconciliation'])->name('bank-reconciliations.export');
            Route::patch('/bank-reconciliation-items/{bankReconciliationItem}', [AccountingControlCentreController::class, 'resolveBankItem'])->name('bank-reconciliation-items.update');
            Route::post('/inventory-controls', [AccountingControlCentreController::class, 'storeInventoryControl'])->name('inventory-controls.store');
            Route::post('/inventory-controls/{inventoryControl}/approve', [AccountingControlCentreController::class, 'approveInventoryControl'])->name('inventory-controls.approve');
            Route::post('/inventory-controls/{inventoryControl}/post', [AccountingControlCentreController::class, 'postInventoryControl'])->name('inventory-controls.post');
            Route::post('/vat-returns', [AccountingControlCentreController::class, 'storeVatReturn'])->name('vat-returns.store');
            Route::patch('/vat-returns/{vatReturn}/status', [AccountingControlCentreController::class, 'transitionVatReturn'])->name('vat-returns.status');
            Route::get('/vat-returns/{vatReturn}/export/{format}', [AccountingControlCentreController::class, 'exportVatReturn'])->name('vat-returns.export');
            Route::post('/closes', [AccountingControlCentreController::class, 'storeClose'])->name('closes.store');
            Route::patch('/closes/{accountingClose}/tasks', [AccountingControlCentreController::class, 'completeCloseTask'])->name('closes.tasks');
            Route::post('/closes/{accountingClose}/review', [AccountingControlCentreController::class, 'reviewClose'])->name('closes.review');
            Route::post('/closes/{accountingClose}/approve', [AccountingControlCentreController::class, 'approveClose'])->name('closes.approve');
            Route::post('/closes/{accountingClose}/reopen', [AccountingControlCentreController::class, 'reopenClose'])->name('closes.reopen');
            Route::post('/closes/{accountingClose}/approve-reopen', [AccountingControlCentreController::class, 'approveReopen'])->name('closes.approve-reopen');
            Route::post('/dimensions', [AccountingControlCentreController::class, 'storeDimension'])->name('dimensions.store');
            Route::post('/budgets', [AccountingControlCentreController::class, 'storeBudget'])->name('budgets.store');
            Route::post('/approval-limits', [AccountingControlCentreController::class, 'storeApprovalLimit'])->name('approval-limits.store');
            Route::post('/attachments', [AccountingControlCentreController::class, 'storeAttachment'])->name('attachments.store');
            Route::get('/attachments/{accountingAttachment}', [AccountingControlCentreController::class, 'downloadAttachment'])->name('attachments.download');
            Route::get('/daily-activity', [AccountingDailyActivityController::class, 'index'])->name('daily-activity');
            Route::post('/customer-invoices', [AccountingDailyActivityController::class, 'storeInvoice'])->name('customer-invoices.store');
            Route::post('/customer-invoices/{customerInvoice}/post', [AccountingDailyActivityController::class, 'postInvoice'])->name('customer-invoices.post');
            Route::get('/customer-invoices/{customerInvoice}/pdf', [AccountingDailyActivityController::class, 'invoicePdf'])->name('customer-invoices.pdf');
            Route::post('/purchase-orders', [AccountingDailyActivityController::class, 'storePurchaseOrder'])->name('purchase-orders.store');
            Route::post('/purchase-orders/{purchaseOrder}/approve', [AccountingDailyActivityController::class, 'approvePurchaseOrder'])->name('purchase-orders.approve');
            Route::post('/purchase-orders/{purchaseOrder}/receive', [AccountingDailyActivityController::class, 'receivePurchaseOrder'])->name('purchase-orders.receive');
            Route::post('/purchase-orders/{purchaseOrder}/supplier-bill', [AccountingDailyActivityController::class, 'billPurchaseOrder'])->name('purchase-orders.supplier-bill');
            Route::post('/bank-statements', [AccountingDailyActivityController::class, 'importBankStatement'])->name('bank-statements.store');
            Route::post('/bank-statements/{bankStatementImport}/auto-match', [AccountingDailyActivityController::class, 'autoMatch'])->name('bank-statements.auto-match');
            Route::post('/bank-statement-lines/{bankStatementLine}/post', [AccountingDailyActivityController::class, 'postBankLine'])->name('bank-statement-lines.post');
            Route::get('/debtors', [AccountingController::class, 'debtors'])->name('debtors');
            Route::get('/cash-movement', [AccountingController::class, 'cashMovement'])->name('cash-movement');
            Route::get('/interest-review', [AccountingController::class, 'interestReview'])->name('interest-review');
            Route::patch('/interest-policy', [AccountingController::class, 'updateInterestPolicy'])->name('interest-policy.update');
            Route::post('/interest-exemptions', [AccountingController::class, 'storeInterestExemption'])->name('interest-exemptions.store');
            Route::delete('/interest-exemptions/{interestExemption}', [AccountingController::class, 'revokeInterestExemption'])->name('interest-exemptions.revoke');
            Route::get('/general-ledger', [AccountingController::class, 'generalLedger'])->name('general-ledger');
            Route::post('/journals', [AccountingController::class, 'storeJournal'])->name('journals.store');
            Route::post('/journals/{journalEntry}/post', [AccountingController::class, 'postJournal'])->name('journals.post');
            Route::post('/journals/{journalEntry}/reverse', [AccountingController::class, 'reverseJournal'])->name('journals.reverse');
            Route::get('/financial-reports', [AccountingController::class, 'reports'])->name('reports');
            Route::get('/financial-reports/export/{format}', [AccountingController::class, 'exportReport'])->name('reports.export');
            Route::get('/settings', [AccountingController::class, 'settings'])->name('settings');
            Route::patch('/settings', [AccountingController::class, 'updateSettings'])->name('settings.update');
            Route::patch('/periods/{accountingPeriod}', [AccountingController::class, 'updatePeriod'])->name('periods.update');
            Route::post('/tax-codes', [AccountingController::class, 'storeTaxCode'])->name('tax-codes.store');
            Route::patch('/tax-codes/{taxCode}', [AccountingController::class, 'updateTaxCode'])->name('tax-codes.update');
            Route::post('/sync-source-documents', [AccountingController::class, 'syncSourceDocuments'])->name('sync-source-documents');
            Route::get('/payables', [AccountingPayablesController::class, 'index'])->name('payables');
            Route::get('/supplier-reconciliation', [SupplierReconciliationController::class, 'index'])->name('supplier-reconciliation');
            Route::post('/supplier-reconciliations', [SupplierReconciliationController::class, 'store'])->name('supplier-reconciliations.store');
            Route::post('/supplier-reconciliations/{supplierReconciliation}/auto-match', [SupplierReconciliationController::class, 'autoMatch'])->name('supplier-reconciliations.auto-match');
            Route::post('/supplier-reconciliations/{supplierReconciliation}/approve', [SupplierReconciliationController::class, 'approve'])->name('supplier-reconciliations.approve');
            Route::patch('/supplier-reconciliation-lines/{supplierReconciliationLine}/match', [SupplierReconciliationController::class, 'match'])->name('supplier-reconciliation-lines.match');
            Route::patch('/supplier-reconciliation-lines/{supplierReconciliationLine}/exception', [SupplierReconciliationController::class, 'exception'])->name('supplier-reconciliation-lines.exception');
            Route::patch('/supplier-reconciliation-lines/{supplierReconciliationLine}/reopen', [SupplierReconciliationController::class, 'reopenLine'])->name('supplier-reconciliation-lines.reopen');
            Route::get('/tax-report', [TaxReportController::class, 'index'])->name('tax-report');
            Route::get('/tax-report/export', [TaxReportController::class, 'export'])->name('tax-report.export');
            Route::post('/suppliers', [AccountingPayablesController::class, 'storeSupplier'])->name('suppliers.store');
            Route::get('/suppliers/export', [AccountingPayablesController::class, 'exportSuppliers'])->name('suppliers.export');
            Route::get('/suppliers/{supplier}', [AccountingPayablesController::class, 'showSupplier'])->name('suppliers.show');
            Route::put('/suppliers/{supplier}', [AccountingPayablesController::class, 'updateSupplier'])->name('suppliers.update');
            Route::patch('/suppliers/{supplier}/status', [AccountingPayablesController::class, 'updateSupplierStatus'])->name('suppliers.status');
            Route::get('/master-data', [AccountingMasterDataController::class, 'index'])->name('master-data');
            Route::post('/catalog-items', [AccountingMasterDataController::class, 'store'])->name('catalog-items.store');
            Route::put('/catalog-items/{catalogItem}', [AccountingMasterDataController::class, 'update'])->name('catalog-items.update');
            Route::patch('/catalog-items/{catalogItem}/status', [AccountingMasterDataController::class, 'updateStatus'])->name('catalog-items.status');
            Route::get('/catalog-items/export', [AccountingMasterDataController::class, 'export'])->name('catalog-items.export');
            Route::post('/supplier-bills', [AccountingPayablesController::class, 'storeBill'])->name('supplier-bills.store');
            Route::post('/supplier-bills/{supplierBill}/post', [AccountingPayablesController::class, 'postBill'])->name('supplier-bills.post');
            Route::post('/supplier-bills/{supplierBill}/payments', [AccountingPayablesController::class, 'payBill'])->name('supplier-bills.payments.store');
        });
    });

    Route::prefix('administration')->name('administration.')->group(function () {
        Route::get('/audit-events', [AuditEventController::class, 'index'])->name('audit-events.index');
        Route::get('/audit-events/{auditEvent}', [AuditEventController::class, 'show'])->whereNumber('auditEvent')->name('audit-events.show');
    });

    Route::middleware('permission:phase-one.view')->prefix('administration')->name('administration.')->group(function () {
        Route::get('/', [AdministrationController::class, 'index'])->name('index');
        Route::get('/users', [UserAdministrationController::class, 'index'])->name('users.index');
        Route::get('/users/invite', [UserAdministrationController::class, 'create'])->name('users.create');
        Route::post('/users/invite', [UserAdministrationController::class, 'store'])->name('users.store');
        Route::get('/users/export', [UserAdministrationController::class, 'export'])->name('users.export');
        Route::get('/users/{user}', [UserAdministrationController::class, 'show'])->name('users.show');
        Route::put('/users/{user}', [UserAdministrationController::class, 'update'])->name('users.update');
        Route::post('/users/{user}/password-reset', [UserAdministrationController::class, 'sendPasswordReset'])->name('users.password-reset');
        Route::post('/users/{user}/impersonate', [UserAdministrationController::class, 'impersonate'])->name('users.impersonate');
        Route::get('/branches/{branch}', [BranchOperationsController::class, 'show'])->name('branches.show');
        Route::get('/data-import', [GapWorkbookImportController::class, 'index'])
            ->middleware('branch.selected')
            ->name('data-import.index');
        Route::post('/data-import', [GapWorkbookImportController::class, 'store'])
            ->middleware('branch.selected')
            ->name('data-import.store');
        Route::get('/gaps-register/export', GapWorkbookExportController::class)
            ->name('gaps-register.export');
        Route::get('/receipts', [ReceiptRegisterController::class, 'index'])->name('receipts.index');
        Route::get('/payments', [PaymentController::class, 'index'])->name('payments.index');
        Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
        Route::get('/payments/export/{format}', [PaymentDetailsController::class, 'export'])->name('payments.export');
        Route::get('/payments/{payment}/receipt', [PaymentDetailsController::class, 'receipt'])->name('payments.receipt');
        Route::get('/payments/{payment}/receipt/print', [PaymentDetailsController::class, 'printReceipt'])->name('payments.receipt.print');
        Route::get('/payments/{payment}/verify', [PaymentDetailsController::class, 'verify'])->name('payments.verify');
        Route::post('/payments/{payment}/reversals', [PaymentReversalController::class, 'store'])
            ->middleware('permission:accounting.post')->name('payments.reversals.store');
        Route::get('/payments/{payment}', [PaymentDetailsController::class, 'show'])->name('payments.show');
        Route::get('/stands/export/{format}', [PhaseOneResourceController::class, 'exportStands'])->name('stands.export');
        Route::get('/stands/map', [StandMapController::class, 'index'])->name('stands.map');
        Route::get('/stands/bulk/template', [PhaseOneResourceController::class, 'bulkStandsTemplate'])->name('stands.bulk-template');
        Route::post('/stands/bulk/preview', [PhaseOneResourceController::class, 'previewBulkStands'])->name('stands.bulk-preview');
        Route::post('/stands/bulk', [PhaseOneResourceController::class, 'bulkStands'])->name('stands.bulk');
        Route::get('/stands/{stand}', [PropertyOperationsController::class, 'stand'])->name('stands.show');
        Route::post('/stands/{stand}/legal-cases', [StandLegalCaseController::class, 'store'])->name('stands.legal-cases.store');
        Route::patch('/stands/{stand}/legal-cases/{legalCase}', [StandLegalCaseController::class, 'update'])->name('stands.legal-cases.update');
        Route::post('/stands/{stand}/legal-cases/{legalCase}/notes', [StandLegalCaseController::class, 'storeNote'])->name('stands.legal-cases.notes.store');
        Route::post('/stands/{stand}/legal-cases/{legalCase}/files', [StandLegalCaseController::class, 'storeFiles'])->name('stands.legal-cases.files.store');
        Route::get('/stands/{stand}/legal-cases/{legalCase}/files/{file}', [StandLegalCaseController::class, 'download'])->name('stands.legal-cases.files.download');
        Route::delete('/stands/{stand}/legal-cases/{legalCase}/files/{file}', [StandLegalCaseController::class, 'destroyFile'])->name('stands.legal-cases.files.destroy');
        Route::get('/clients/export/{format}', [PhaseOneResourceController::class, 'exportClients'])->name('clients.export-directory');
        Route::get('/clients/{client}', [PropertyOperationsController::class, 'client'])->name('clients.show');
        Route::get('/clients/{client}/verify', [PropertyOperationsController::class, 'verifyClientProfile'])->name('clients.verify');
        Route::get('/clients/{client}/export/{format}', [PropertyOperationsController::class, 'clientExport'])->name('clients.export');
        Route::get('/clients/{client}/receipts/pdf', [ClientDocumentController::class, 'receiptsPdf'])->name('clients.receipts.pdf');
        Route::get('/clients/{client}/receipts/print', [ClientDocumentController::class, 'receiptsPrint'])->name('clients.receipts.print');
        Route::get('/clients/{client}/statement/pdf', [ClientDocumentController::class, 'statementPdf'])->name('clients.statement.pdf');
        Route::get('/clients/{client}/statement/print', [ClientDocumentController::class, 'statementPrint'])->name('clients.statement.print');
        Route::get('/stand-allocations/{standAllocation}/export/{format}', [PropertyOperationsController::class, 'allocationExport'])->name('stand-allocations.export');
        Route::get('/stand-allocations/{standAllocation}', [PropertyOperationsController::class, 'allocation'])->name('stand-allocations.show');
        Route::post('/stand-allocations/{standAllocation}/installments', [InstallmentController::class, 'store'])->name('stand-allocations.installments.store');
        Route::post('/stand-allocations/{standAllocation}/installments/{installment}/payments', [AllocationPaymentController::class, 'store'])->name('stand-allocations.installments.payments.store');
        Route::post('/stand-allocations/{standAllocation}/installments/{installment}/reminders', [InstallmentReminderController::class, 'store'])->name('stand-allocations.installments.reminders.store');
        Route::patch('/stand-allocations/{standAllocation}/installments/{installment}/reminders/{installmentReminder}/sent', [InstallmentReminderController::class, 'markSent'])->name('stand-allocations.installments.reminders.sent');
        Route::get('/{resource}/export/{format}', [PhaseOneResourceController::class, 'exportFinance'])->whereIn('resource', FinanceRegister::KEYS)->name('finance.export');
        Route::get('/{resource}', [PhaseOneResourceController::class, 'index'])->name('resource.index');
        Route::post('/{resource}', [PhaseOneResourceController::class, 'store'])->name('resource.store');
        Route::put('/{resource}/{record}', [PhaseOneResourceController::class, 'update'])->name('resource.update');
        Route::delete('/{resource}/{record}', [PhaseOneResourceController::class, 'destroy'])->name('resource.destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
