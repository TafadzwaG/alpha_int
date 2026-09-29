<?php

use App\Http\Controllers\AccountingController;
use App\Http\Controllers\AdministrationController;
use App\Http\Controllers\AllocationPaymentController;
use App\Http\Controllers\ApprovalRequestController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InstallmentController;
use App\Http\Controllers\InstallmentReminderController;
use App\Http\Controllers\PhaseOneResourceController;
use App\Http\Controllers\PropertyOperationsController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::middleware('permission:phase-one.view')->group(function () {
        Route::get('approvals', [ApprovalRequestController::class, 'index'])->middleware('permission:expenses.view')->name('approvals.index');
        Route::post('approvals/{approvalRequest}/decision', [ApprovalRequestController::class, 'decide'])
            ->middleware('permission:expenses.approve')
            ->name('approvals.decision');
        Route::get('reports', [ReportController::class, 'index'])->middleware('permission:reports.view')->name('reports.index');
        Route::get('reports/export/pdf', [ReportController::class, 'pdf'])->middleware('permission:reports.view')->name('reports.export.pdf');
        Route::get('reports/export/excel', [ReportController::class, 'excel'])->middleware('permission:reports.view')->name('reports.export.excel');
        Route::middleware('permission:accounting.view')->prefix('accounting')->name('accounting.')->group(function () {
            Route::get('/', [AccountingController::class, 'index'])->name('index');
            Route::get('/debtors', [AccountingController::class, 'debtors'])->name('debtors');
        });
    });

    Route::middleware('permission:phase-one.view')->prefix('administration')->name('administration.')->group(function () {
        Route::get('/', [AdministrationController::class, 'index'])->name('index');
        Route::get('/stands/{stand}', [PropertyOperationsController::class, 'stand'])->name('stands.show');
        Route::get('/clients/{client}', [PropertyOperationsController::class, 'client'])->name('clients.show');
        Route::get('/stand-allocations/{standAllocation}', [PropertyOperationsController::class, 'allocation'])->name('stand-allocations.show');
        Route::post('/stand-allocations/{standAllocation}/installments', [InstallmentController::class, 'store'])->name('stand-allocations.installments.store');
        Route::post('/stand-allocations/{standAllocation}/installments/{installment}/payments', [AllocationPaymentController::class, 'store'])->name('stand-allocations.installments.payments.store');
        Route::post('/stand-allocations/{standAllocation}/installments/{installment}/reminders', [InstallmentReminderController::class, 'store'])->name('stand-allocations.installments.reminders.store');
        Route::patch('/stand-allocations/{standAllocation}/installments/{installment}/reminders/{installmentReminder}/sent', [InstallmentReminderController::class, 'markSent'])->name('stand-allocations.installments.reminders.sent');
        Route::get('/{resource}', [PhaseOneResourceController::class, 'index'])->name('resource.index');
        Route::post('/{resource}', [PhaseOneResourceController::class, 'store'])->name('resource.store');
        Route::put('/{resource}/{record}', [PhaseOneResourceController::class, 'update'])->name('resource.update');
        Route::delete('/{resource}/{record}', [PhaseOneResourceController::class, 'destroy'])->name('resource.destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
