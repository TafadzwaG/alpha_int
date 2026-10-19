<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\CatalogItem;
use App\Models\ClientAccount;
use App\Models\CustomerInvoice;
use App\Models\GlAccount;
use App\Models\InventoryMovement;
use App\Models\Organization;
use App\Models\Supplier;
use App\Models\SupplierBill;
use App\Models\SupplierPayment;
use App\Models\SupplierReconciliation;
use App\Models\TaxCode;
use App\Models\User;
use App\Services\DailyAccountingService;
use App\Services\GeneralLedgerService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

class AccountingDemoSeeder extends Seeder
{
    public function run(): void
    {
        $ledger = app(GeneralLedgerService::class);
        $daily = app(DailyAccountingService::class);

        Organization::query()->each(function (Organization $organization) use ($daily, $ledger): void {
            $admin = User::query()
                ->where('organization_id', $organization->id)
                ->where('email', 'test@example.com')
                ->first()
                ?? User::query()->where('organization_id', $organization->id)->oldest('id')->first();
            if (! $admin) {
                return;
            }

            $branches = Branch::query()->where('organization_id', $organization->id)->get()->keyBy('code');
            $accounts = GlAccount::query()->where('organization_id', $organization->id)->get()->keyBy('system_key');
            if ($branches->isEmpty() || ! $accounts->has('operating_expense') || ! $accounts->has('accounts_payable')) {
                return;
            }
            BankAccount::query()->where('organization_id', $organization->id)->whereNull('gl_account_id')->update(['gl_account_id' => $accounts['bank']->id]);

            $supplierBlueprints = [
                ['SUP-DEMO-001', 'SurveyPro Zimbabwe', 'VAT-310001', 'accounts@surveypro.test', '+263 24 2550101', '14 Harare Drive, Harare', 30],
                ['SUP-DEMO-002', 'City of Harare', 'VAT-310002', 'revenue@hararecity.test', '+263 24 2753000', 'Town House, Julius Nyerere Way, Harare', 30],
                ['SUP-DEMO-003', 'ZESA Enterprises', 'VAT-310003', 'creditcontrol@zesa.test', '+263 24 2773300', '25 Samora Machel Avenue, Harare', 14],
                ['SUP-DEMO-004', 'Alpha Legal Chambers', 'VAT-310004', 'finance@alphalegal.test', '+263 24 2704400', '8th Floor, Finsure House, Harare', 30],
                ['SUP-DEMO-005', 'RoadBuild Contractors', 'VAT-310005', 'billing@roadbuild.test', '+263 77 2455000', 'Kelvin Industrial Area, Bulawayo', 45],
                ['SUP-DEMO-006', 'OfficeMart Supplies', 'VAT-310006', 'orders@officemart.test', '+263 24 2488100', '52 Kaguvi Street, Harare', 30],
                ['SUP-DEMO-007', 'Safeguard Security', 'VAT-310007', 'debtors@safeguard.test', '+263 24 2443937', '58 Rhodesville Avenue, Harare', 30],
            ];

            $suppliers = collect($supplierBlueprints)->mapWithKeys(function (array $row) use ($organization): array {
                $supplier = Supplier::query()->updateOrCreate(
                    ['organization_id' => $organization->id, 'supplier_no' => $row[0]],
                    [
                        'name' => $row[1],
                        'tax_number' => $row[2],
                        'email' => $row[3],
                        'phone' => $row[4],
                        'address' => $row[5],
                        'currency_code' => 'USD',
                        'payment_terms_days' => $row[6],
                        'status' => 'active',
                    ],
                );

                return [$row[0] => $supplier];
            });

            $taxCodes = TaxCode::query()->where('organization_id', $organization->id)->get()->keyBy('code');
            $catalogBlueprints = [
                ['SRV-SURVEY', 'Boundary and topographical survey', 'service', 'survey', 1220.00, 'SUP-DEMO-001', 'VAT15'],
                ['SRV-MUNICIPAL', 'Municipal rates and service charges', 'service', 'month', 4500.00, 'SUP-DEMO-002', 'ZERO'],
                ['SRV-ELECTRIC', 'Development electricity connection fees', 'service', 'connection', 2850.00, 'SUP-DEMO-003', 'VAT15'],
                ['SRV-LEGAL', 'Conveyancing and compliance services', 'service', 'matter', 2200.00, 'SUP-DEMO-004', 'VAT15'],
                ['SRV-ROADWORK', 'Access road grading and drainage', 'service', 'project', 12000.00, 'SUP-DEMO-005', 'ZERO'],
                ['PRD-STATIONERY', 'Office stationery and printer consumables', 'product', 'pack', 920.00, 'SUP-DEMO-006', 'VAT15'],
                ['SRV-SECURITY', 'Site security and rapid response services', 'service', 'month', 1800.00, 'SUP-DEMO-007', 'VAT15'],
                ['PRD-ARCHIVE', 'Archive boxes and filing supplies', 'product', 'pack', 640.00, 'SUP-DEMO-006', 'VAT15'],
            ];
            $catalog = collect($catalogBlueprints)->mapWithKeys(function (array $row) use ($organization, $suppliers, $accounts, $taxCodes): array {
                $taxCode = $taxCodes->get($row[6])
                    ?? ($row[6] === 'ZERO'
                        ? $taxCodes->first(fn (TaxCode $candidate) => (float) $candidate->rate === 0.0)
                        : $taxCodes->first(fn (TaxCode $candidate) => (float) $candidate->rate > 0));
                $item = CatalogItem::query()->updateOrCreate(
                    ['organization_id' => $organization->id, 'code' => $row[0]],
                    [
                        'name' => $row[1],
                        'description' => 'Reusable purchasing master record for '.$row[1].'.',
                        'type' => $row[2],
                        'unit_of_measure' => $row[3],
                        'default_unit_price' => $row[4],
                        'default_cost' => $row[2] === 'product' ? round($row[4] * 0.6, 2) : 0,
                        'average_cost' => $row[2] === 'product' ? round($row[4] * 0.6, 2) : 0,
                        'reorder_level' => $row[2] === 'product' ? 10 : 0,
                        'track_inventory' => $row[2] === 'product',
                        'currency_code' => 'USD',
                        'default_supplier_id' => $suppliers[$row[5]]->id,
                        'expense_account_id' => $accounts['operating_expense']->id,
                        'revenue_account_id' => $accounts['sales_revenue']->id,
                        'inventory_account_id' => $row[2] === 'product' ? $accounts['inventory']->id : null,
                        'cogs_account_id' => $row[2] === 'product' ? $accounts['cost_of_sales']->id : null,
                        'tax_code_id' => $taxCode?->id,
                        'status' => 'active',
                    ],
                );

                return [$row[1] => $item];
            });

            foreach ($catalog->where('track_inventory', true) as $item) {
                $branch = $branches['HQ'] ?? $branches->first();
                InventoryMovement::query()->firstOrCreate(
                    ['source_type' => self::class, 'source_id' => 800000 + $item->id, 'catalog_item_id' => $item->id, 'movement_type' => 'opening'],
                    ['organization_id' => $organization->id, 'branch_id' => $branch->id, 'quantity' => 100, 'unit_cost' => $item->default_cost,
                        'reference' => 'DEMO-OPENING-STOCK', 'occurred_at' => today()->startOfYear(), 'created_by' => $admin->id],
                );
            }

            $billBlueprints = [
                ['AP-DEMO-001', 'SUP-DEMO-001', 'SP-2026-1042', 'Boundary and topographical survey', 1220.00, 15.00, -10, 0.00, 'HQ'],
                ['AP-DEMO-002', 'SUP-DEMO-002', 'COH-RATES-8841', 'Municipal rates and service charges', 4500.00, 0.00, 45, 1500.00, 'HQ'],
                ['AP-DEMO-003', 'SUP-DEMO-003', 'ZESA-CONN-2309', 'Development electricity connection fees', 2850.00, 15.00, 75, 1000.00, 'NORTH'],
                ['AP-DEMO-004', 'SUP-DEMO-004', 'ALC-INV-0198', 'Conveyancing and compliance services', 2200.00, 15.00, 105, 0.00, 'HQ'],
                ['AP-DEMO-005', 'SUP-DEMO-005', 'RBC-2026-778', 'Access road grading and drainage', 12000.00, 0.00, 135, 4000.00, 'BYO'],
                ['AP-DEMO-006', 'SUP-DEMO-006', 'OMS-44610', 'Office stationery and printer consumables', 920.00, 15.00, 165, 0.00, 'BYO'],
                ['AP-DEMO-007', 'SUP-DEMO-007', 'SG-SEC-931', 'Site security and rapid response services', 1800.00, 15.00, 210, 600.00, 'HQ'],
                ['AP-DEMO-008', 'SUP-DEMO-006', 'OMS-45118', 'Archive boxes and filing supplies', 640.00, 15.00, 20, 736.00, 'NORTH'],
            ];

            foreach ($billBlueprints as $index => $row) {
                [$billNo, $supplierNo, $reference, $description, $subtotal, $taxRate, $daysPastDue, $paidAmount, $branchCode] = $row;
                $branch = $branches[$branchCode] ?? $branches->first();
                $supplier = $suppliers[$supplierNo];
                $dueDate = $daysPastDue < 0 ? today()->addDays(abs($daysPastDue)) : today()->subDays($daysPastDue);
                $billDate = $dueDate->copy()->subDays($supplier->payment_terms_days);
                $taxAmount = round($subtotal * $taxRate / 100, 2);
                $total = round($subtotal + $taxAmount, 2);
                $paidAmount = min($paidAmount, $total);

                $bill = SupplierBill::query()->updateOrCreate(
                    ['organization_id' => $organization->id, 'bill_no' => $billNo],
                    [
                        'branch_id' => $branch->id,
                        'supplier_id' => $supplier->id,
                        'supplier_reference' => $reference,
                        'bill_date' => $billDate->toDateString(),
                        'due_date' => $dueDate->toDateString(),
                        'currency_code' => 'USD',
                        'subtotal' => $subtotal,
                        'tax_amount' => $taxAmount,
                        'total_amount' => $total,
                        'paid_amount' => $paidAmount,
                        'status' => $paidAmount >= $total ? 'paid' : ($paidAmount > 0 ? 'partially_paid' : 'posted'),
                        'description' => $description,
                        'created_by' => $admin->id,
                        'posted_by' => $admin->id,
                        'posted_at' => $billDate->copy()->endOfDay(),
                    ],
                );

                $bill->lines()->updateOrCreate(
                    ['description' => $description],
                    [
                        'catalog_item_id' => $catalog[$description]?->id,
                        'gl_account_id' => $accounts['operating_expense']->id,
                        'quantity' => 1,
                        'unit_price' => $subtotal,
                        'tax_code' => $taxRate > 0 ? 'VAT15' : 'ZERO',
                        'tax_rate' => $taxRate,
                        'line_subtotal' => $subtotal,
                        'tax_amount' => $taxAmount,
                        'line_total' => $total,
                    ],
                );

                $journalLines = collect([
                    ['gl_account_id' => $accounts['operating_expense']->id, 'debit' => $subtotal, 'credit' => 0, 'description' => $description],
                    ['gl_account_id' => $accounts['accounts_payable']->id, 'debit' => 0, 'credit' => $total, 'description' => 'Payable to '.$supplier->name],
                ]);
                if ($taxAmount > 0) {
                    $journalLines->splice(1, 0, [[
                        'gl_account_id' => $accounts['vat_input']->id,
                        'debit' => $taxAmount,
                        'credit' => 0,
                        'description' => 'Input VAT',
                    ]]);
                }
                $journal = $ledger->createSystemJournal($organization->id, $branch->id, $admin->id, [
                    'entry_date' => $billDate->toDateString(),
                    'journal_type' => 'purchase',
                    'reference' => $billNo,
                    'description' => 'Demo supplier bill '.$billNo,
                    'currency_code' => 'USD',
                    'source_type' => SupplierBill::class,
                    'source_id' => $bill->id,
                    'lines' => $journalLines->all(),
                ]);
                $bill->forceFill(['journal_entry_id' => $journal?->id])->save();

                if ($paidAmount <= 0) {
                    continue;
                }

                $bankAccount = BankAccount::query()
                    ->where('organization_id', $organization->id)
                    ->where('branch_id', $branch->id)
                    ->first();
                $payment = SupplierPayment::query()->updateOrCreate(
                    ['supplier_bill_id' => $bill->id, 'reference' => 'DEMO-EFT-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT)],
                    [
                        'bank_account_id' => $bankAccount?->id,
                        'payment_date' => $billDate->copy()->addDays(7)->toDateString(),
                        'amount' => $paidAmount,
                        'currency_code' => 'USD',
                        'created_by' => $admin->id,
                    ],
                );
                $paymentJournal = $ledger->createSystemJournal($organization->id, $branch->id, $admin->id, [
                    'entry_date' => $payment->payment_date->toDateString(),
                    'journal_type' => 'cash_payment',
                    'reference' => $payment->reference,
                    'description' => 'Demo payment for '.$billNo,
                    'currency_code' => 'USD',
                    'source_type' => SupplierPayment::class,
                    'source_id' => $payment->id,
                    'lines' => [
                        ['gl_account_id' => $accounts['accounts_payable']->id, 'debit' => $paidAmount, 'credit' => 0, 'description' => 'Settle '.$billNo],
                        ['gl_account_id' => $accounts['bank']->id, 'debit' => 0, 'credit' => $paidAmount, 'description' => 'Bank payment '.$payment->reference],
                    ],
                ]);
                $payment->forceFill(['journal_entry_id' => $paymentJournal?->id])->save();
            }

            $reconciledBill = SupplierBill::query()
                ->where('organization_id', $organization->id)
                ->where('bill_no', 'AP-DEMO-002')
                ->first();
            if ($reconciledBill) {
                $reconciledPayment = $reconciledBill->payments()->first();
                $reconciliation = SupplierReconciliation::query()->updateOrCreate(
                    ['organization_id' => $organization->id, 'statement_no' => 'COH-STATEMENT-DEMO'],
                    [
                        'branch_id' => $reconciledBill->branch_id,
                        'supplier_id' => $reconciledBill->supplier_id,
                        'statement_date' => today(),
                        'from_date' => $reconciledBill->bill_date,
                        'to_date' => today(),
                        'currency_code' => $reconciledBill->currency_code,
                        'opening_balance' => 0,
                        'statement_balance' => (float) $reconciledBill->total_amount - (float) ($reconciledPayment?->amount ?? 0),
                        'ledger_balance' => (float) $reconciledBill->total_amount - (float) ($reconciledPayment?->amount ?? 0),
                        'variance' => 0,
                        'status' => 'reconciled',
                        'original_filename' => 'city-of-harare-demo-statement.csv',
                        'notes' => 'Demonstration of a fully matched and signed-off supplier statement.',
                        'prepared_by' => $admin->id,
                        'approved_by' => $admin->id,
                        'approved_at' => now(),
                    ],
                );
                $reconciliation->lines()->delete();
                $reconciliation->lines()->create([
                    'transaction_date' => $reconciledBill->bill_date,
                    'transaction_type' => 'invoice',
                    'reference' => $reconciledBill->supplier_reference,
                    'description' => $reconciledBill->description,
                    'amount' => $reconciledBill->total_amount,
                    'line_hash' => hash('sha256', 'demo-reconciliation-bill-'.$reconciledBill->id),
                    'match_status' => 'matched',
                    'match_type' => SupplierBill::class,
                    'match_id' => $reconciledBill->id,
                    'matched_by' => $admin->id,
                    'matched_at' => now(),
                ]);
                if ($reconciledPayment) {
                    $reconciliation->lines()->create([
                        'transaction_date' => $reconciledPayment->payment_date,
                        'transaction_type' => 'payment',
                        'reference' => $reconciledPayment->reference,
                        'description' => 'Payment received and allocated by supplier',
                        'amount' => -(float) $reconciledPayment->amount,
                        'line_hash' => hash('sha256', 'demo-reconciliation-payment-'.$reconciledPayment->id),
                        'match_status' => 'matched',
                        'match_type' => SupplierPayment::class,
                        'match_id' => $reconciledPayment->id,
                        'matched_by' => $admin->id,
                        'matched_at' => now(),
                    ]);
                }
            }

            $draftSupplier = $suppliers['SUP-DEMO-001'];
            $draftBranch = $branches['HQ'] ?? $branches->first();
            $draft = SupplierBill::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'bill_no' => 'AP-DEMO-DRAFT-001'],
                [
                    'branch_id' => $draftBranch->id,
                    'supplier_id' => $draftSupplier->id,
                    'supplier_reference' => 'SP-QUOTE-112',
                    'bill_date' => today()->toDateString(),
                    'due_date' => today()->addDays(30)->toDateString(),
                    'currency_code' => 'USD',
                    'subtotal' => 600,
                    'tax_amount' => 90,
                    'total_amount' => 690,
                    'paid_amount' => 0,
                    'status' => 'draft',
                    'description' => 'Pending cadastral diagram update',
                    'created_by' => $admin->id,
                    'posted_by' => null,
                    'posted_at' => null,
                ],
            );
            $draft->lines()->updateOrCreate(
                ['description' => 'Pending cadastral diagram update'],
                [
                    'catalog_item_id' => $catalog['Boundary and topographical survey']?->id,
                    'gl_account_id' => $accounts['operating_expense']->id,
                    'quantity' => 1,
                    'unit_price' => 600,
                    'tax_code' => 'VAT15',
                    'tax_rate' => 15,
                    'line_subtotal' => 600,
                    'tax_amount' => 90,
                    'line_total' => 690,
                ],
            );

            $this->seedOpeningJournals($organization, $admin, $branches['HQ'] ?? $branches->first(), $accounts, $ledger);
            $this->seedTaxableCustomerInvoice($organization, $admin, $branches['HQ'] ?? $branches->first(), $accounts, $catalog, $daily);
        });
    }

    private function seedTaxableCustomerInvoice(Organization $organization, User $admin, Branch $branch, Collection $accounts, Collection $catalog, DailyAccountingService $daily): void
    {
        $clientAccount = ClientAccount::query()
            ->whereHas('clientFile.client', fn ($query) => $query->where('organization_id', $organization->id))
            ->whereHas('clientFile', fn ($query) => $query->where('branch_id', $branch->id))
            ->first();
        $item = $catalog['Conveyancing and compliance services'] ?? null;
        if (! $clientAccount || ! $item) {
            return;
        }

        $invoice = CustomerInvoice::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'invoice_no' => 'INV-DEMO-VAT-001'],
            [
                'branch_id' => $branch->id,
                'client_account_id' => $clientAccount->id,
                'invoice_date' => today()->subDays(7),
                'due_date' => today()->addDays(23),
                'currency_code' => 'USD',
                'subtotal' => 2000,
                'tax_amount' => 300,
                'total_amount' => 2300,
                'paid_amount' => 0,
                'status' => 'draft',
                'description' => 'Demo conveyancing service invoice with output VAT',
                'created_by' => $admin->id,
            ],
        );
        $invoice->lines()->firstOrCreate(
            ['description' => 'Conveyancing and compliance services'],
            [
                'catalog_item_id' => $item->id,
                'revenue_account_id' => $accounts['sales_revenue']->id,
                'quantity' => 1,
                'unit_price' => 2000,
                'unit_cost' => 0,
                'tax_code' => 'VAT15',
                'tax_rate' => 15,
                'line_subtotal' => 2000,
                'tax_amount' => 300,
                'line_total' => 2300,
            ],
        );
        if ($invoice->status === 'draft') {
            $daily->postInvoice($invoice, $admin);
        }
    }

    private function seedOpeningJournals(Organization $organization, User $admin, Branch $branch, Collection $accounts, GeneralLedgerService $ledger): void
    {
        $journals = [
            [900001, today()->startOfYear()->addDays(2), 'opening_balance', 'DEMO-OPENING-BANK', 'Opening bank and retained earnings balance', [
                ['gl_account_id' => $accounts['bank']->id, 'debit' => 250000, 'credit' => 0],
                ['gl_account_id' => $accounts['retained_earnings']->id, 'debit' => 0, 'credit' => 250000],
            ]],
            [900002, today()->startOfYear()->addDays(12), 'cash_disbursement', 'DEMO-LAND-PURCHASE', 'Acquisition of development land', [
                ['gl_account_id' => $accounts['inventory']->id, 'debit' => 85000, 'credit' => 0],
                ['gl_account_id' => $accounts['bank']->id, 'debit' => 0, 'credit' => 85000],
            ]],
            [900003, today()->subDays(14), 'cash_disbursement', 'DEMO-BANK-FEES', 'Monthly bank service charges', [
                ['gl_account_id' => $accounts['bank_charges']->id, 'debit' => 125, 'credit' => 0],
                ['gl_account_id' => $accounts['bank']->id, 'debit' => 0, 'credit' => 125],
            ]],
        ];

        foreach ($journals as [$sourceId, $entryDate, $type, $reference, $description, $lines]) {
            $ledger->createSystemJournal($organization->id, $branch->id, $admin->id, [
                'entry_date' => $entryDate->toDateString(),
                'journal_type' => $type,
                'reference' => $reference,
                'description' => $description,
                'currency_code' => 'USD',
                'source_type' => self::class,
                'source_id' => $sourceId,
                'lines' => $lines,
            ]);
        }
    }
}
