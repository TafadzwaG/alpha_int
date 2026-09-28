<?php

use App\Http\Controllers\AdministrationController;
use App\Http\Controllers\ApprovalRequestController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PhaseOneResourceController;
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
    });

    Route::middleware('permission:phase-one.view')->prefix('administration')->name('administration.')->group(function () {
        Route::get('/', [AdministrationController::class, 'index'])->name('index');
        Route::get('/{resource}', [PhaseOneResourceController::class, 'index'])->name('resource.index');
        Route::post('/{resource}', [PhaseOneResourceController::class, 'store'])->name('resource.store');
        Route::put('/{resource}/{record}', [PhaseOneResourceController::class, 'update'])->name('resource.update');
        Route::delete('/{resource}/{record}', [PhaseOneResourceController::class, 'destroy'])->name('resource.destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
