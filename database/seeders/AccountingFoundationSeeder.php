<?php

namespace Database\Seeders;

use App\Models\AccountingApprovalLimit;
use App\Models\AccountingBudget;
use App\Models\AccountingDimension;
use App\Models\AccountingPeriod;
use App\Models\BankAccount;
use App\Models\CatalogItem;
use App\Models\FiscalYear;
use App\Models\GlAccount;
use App\Models\InterestPolicy;
use App\Models\Organization;
use App\Models\SystemSetting;
use App\Models\TaxCode;
use Illuminate\Database\Seeder;

class AccountingFoundationSeeder extends Seeder
{
    public function run(): void
    {
        Organization::query()->each(function (Organization $organization): void {
            $accounts = collect([
                ['1000', 'Bank', 'asset', 'bank', 'debit', 'bank', true, true],
                ['1010', 'Cash clearing', 'asset', 'cash', 'debit', 'cash_clearing', true, true],
                ['1100', 'Trade receivables', 'asset', 'receivables', 'debit', 'accounts_receivable', true, false],
                ['1200', 'VAT input', 'asset', 'tax', 'debit', 'vat_input', true, false],
                ['1300', 'Inventory and land', 'asset', 'inventory', 'debit', 'inventory', true, false],
                ['2000', 'Trade payables', 'liability', 'payables', 'credit', 'accounts_payable', true, false],
                ['2100', 'VAT output', 'liability', 'tax', 'credit', 'vat_output', true, false],
                ['2200', 'Accrued expenses', 'liability', 'accruals', 'credit', 'accrued_expenses', true, false],
                ['3000', 'Retained earnings', 'equity', 'retained_earnings', 'credit', 'retained_earnings', true, false],
                ['4000', 'Property sales', 'revenue', 'sales', 'credit', 'sales_revenue', false, true],
                ['4900', 'Other income', 'revenue', 'other_income', 'credit', 'other_income', false, true],
                ['5000', 'Cost of property sold', 'expense', 'cost_of_sales', 'debit', 'cost_of_sales', false, true],
                ['6000', 'Operating expenses', 'expense', 'operating', 'debit', 'operating_expense', false, true],
                ['6100', 'Bank charges', 'expense', 'finance', 'debit', 'bank_charges', false, true],
                ['9999', 'Suspense account', 'asset', 'suspense', 'debit', 'suspense', true, false],
            ])->map(function (array $row) use ($organization): GlAccount {
                return GlAccount::query()->updateOrCreate(
                    ['organization_id' => $organization->id, 'code' => $row[0]],
                    ['name' => $row[1], 'type' => $row[2], 'subtype' => $row[3], 'normal_balance' => $row[4], 'system_key' => $row[5], 'control_account' => $row[6], 'allow_manual_posting' => $row[7], 'active' => true],
                );
            })->keyBy('system_key');

            $yearStart = today()->startOfYear();
            $year = FiscalYear::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'starts_on' => $yearStart->toDateString()],
                ['name' => 'FY '.$yearStart->format('Y'), 'ends_on' => $yearStart->copy()->endOfYear()->toDateString(), 'status' => 'open'],
            );
            foreach (range(1, 12) as $month) {
                $start = $yearStart->copy()->month($month)->startOfMonth();
                AccountingPeriod::query()->updateOrCreate(
                    ['fiscal_year_id' => $year->id, 'period_number' => $month],
                    ['name' => $start->format('F Y'), 'starts_on' => $start->toDateString(), 'ends_on' => $start->copy()->endOfMonth()->toDateString(), 'status' => 'open'],
                );
            }

            TaxCode::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'code' => 'VAT15'],
                ['name' => 'VAT 15%', 'rate' => 15, 'type' => 'vat', 'input_account_id' => $accounts['vat_input']->id, 'output_account_id' => $accounts['vat_output']->id, 'active' => true],
            );
            TaxCode::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'code' => 'ZERO'],
                ['name' => 'Zero rated', 'rate' => 0, 'type' => 'zero', 'input_account_id' => $accounts['vat_input']->id, 'output_account_id' => $accounts['vat_output']->id, 'active' => true],
            );

            SystemSetting::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'branch_id' => null,
                    'setting_key' => 'accounting.control',
                    'effective_from' => $yearStart->copy()->startOfDay(),
                ],
                [
                    'value_json' => [
                        'fiscal_year_start_month' => 1,
                        'default_tax_code' => 'VAT15',
                        'default_payment_terms_days' => 30,
                        'journal_prefix' => 'JRN',
                        'source_posting_mode' => 'automatic',
                    ],
                    'data_type' => 'json',
                ],
            );

            InterestPolicy::query()->updateOrCreate(
                ['organization_id' => $organization->id],
                [
                    'name' => 'Standard overdue interest',
                    'base_annual_rate' => 12,
                    'grace_days' => 30,
                    'merit_window_months' => 6,
                    'merit_exemption_threshold' => 90,
                    'merit_discount_threshold' => 75,
                    'discounted_annual_rate' => 6,
                    'minimum_overdue_balance' => 0,
                    'active' => true,
                ],
            );

            BankAccount::query()->where('organization_id', $organization->id)
                ->whereNull('gl_account_id')->update(['gl_account_id' => $accounts['bank']->id]);
            CatalogItem::query()->where('organization_id', $organization->id)->get()->each(function (CatalogItem $item): void {
                if ((float) $item->average_cost === 0.0 && (float) $item->default_cost !== 0.0) {
                    $item->forceFill(['average_cost' => $item->default_cost])->save();
                }
            });

            $dimensions = collect([
                ['department', 'SALES', 'Sales and collections'],
                ['department', 'FIN', 'Finance and accounting'],
                ['cost_centre', 'HQ', 'Head Office'],
                ['project', 'HATCLIFFE', 'Hatcliffe development'],
            ])->map(fn (array $row) => AccountingDimension::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'kind' => $row[0], 'code' => $row[1]],
                ['name' => $row[2], 'active' => true],
            ));

            foreach (range(1, 12) as $month) {
                foreach (['operating_expense' => 25000, 'sales_revenue' => 75000] as $systemKey => $amount) {
                    AccountingBudget::query()->updateOrCreate([
                        'organization_id' => $organization->id,
                        'fiscal_year_id' => $year->id,
                        'accounting_dimension_id' => $dimensions->firstWhere('code', $systemKey === 'sales_revenue' ? 'SALES' : 'FIN')?->id,
                        'gl_account_id' => $accounts[$systemKey]->id,
                        'period_number' => $month,
                    ], ['amount' => $amount, 'warning_threshold' => 90, 'require_approval' => true]);
                }
            }

            foreach ([
                ['Accounts Officer', 'invoice', 0, 25000],
                ['Accounts Officer', 'supplier_payment', 0, 10000],
                ['System Administrator', 'invoice', 0, null],
                ['System Administrator', 'journal', 0, null],
                ['System Administrator', 'inventory_adjustment', 0, null],
            ] as $limit) {
                AccountingApprovalLimit::query()->updateOrCreate([
                    'organization_id' => $organization->id,
                    'role_name' => $limit[0],
                    'transaction_type' => $limit[1],
                ], ['minimum_amount' => $limit[2], 'maximum_amount' => $limit[3], 'active' => true]);
            }
        });
    }
}
