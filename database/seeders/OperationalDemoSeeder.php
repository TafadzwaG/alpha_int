<?php

namespace Database\Seeders;

use App\Models\AccountCharge;
use App\Models\ApprovalRequest;
use App\Models\ApprovalStep;
use App\Models\BankAccount;
use App\Models\BankDeposit;
use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\ClientAccount;
use App\Models\ClientFile;
use App\Models\Development;
use App\Models\DevelopmentPhase;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ExpenseLine;
use App\Models\Installment;
use App\Models\InstallmentReminder;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\PettyCashEntry;
use App\Models\Receipt;
use App\Models\ReconciliationRun;
use App\Models\ReportRefreshLog;
use App\Models\Role;
use App\Models\Stand;
use App\Models\StandAllocation;
use App\Models\StandType;
use App\Models\User;
use App\Models\UserBranchAccess;
use App\Models\WorkflowAction;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OperationalDemoSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::where('code', 'ALPHA')->firstOrFail();
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        setPermissionsTeamId($organization->id);

        $branches = collect([
            ['code' => 'HQ', 'name' => 'Head Office', 'address' => 'Harare CBD'],
            ['code' => 'NORTH', 'name' => 'Northern Sales Office', 'address' => 'Borrowdale, Harare'],
            ['code' => 'BYO', 'name' => 'Bulawayo Branch', 'address' => 'Fife Street, Bulawayo'],
        ])->mapWithKeys(function (array $data) use ($organization) {
            $branch = Branch::updateOrCreate(
                ['organization_id' => $organization->id, 'code' => $data['code']],
                ['name' => $data['name'], 'timezone' => 'Africa/Harare', 'address' => $data['address'], 'status' => 'active'],
            );

            return [$data['code'] => $branch];
        });

        $managerRole = Role::where('organization_id', $organization->id)->where('code', 'BRANCH_MANAGER')->firstOrFail();
        foreach ([
            ['name' => 'Rudo Moyo', 'email' => 'rudo.moyo@alphaland.test', 'branch' => 'NORTH'],
            ['name' => 'Tawanda Ncube', 'email' => 'tawanda.ncube@alphaland.test', 'branch' => 'BYO'],
        ] as $managerData) {
            $manager = User::updateOrCreate(
                ['email' => $managerData['email']],
                ['organization_id' => $organization->id, 'home_branch_id' => $branches[$managerData['branch']]->id, 'name' => $managerData['name'], 'password' => 'password', 'email_verified_at' => now(), 'status' => 'active'],
            );
            $manager->syncRoles([$managerRole]);
            UserBranchAccess::updateOrCreate(
                ['user_id' => $manager->id, 'branch_id' => $branches[$managerData['branch']]->id],
                ['access_level' => 'manager', 'active' => true],
            );
        }

        $bankAccounts = $branches->map(fn (Branch $branch) => BankAccount::updateOrCreate(
            ['organization_id' => $organization->id, 'account_mask' => '****'.str_pad((string) (4100 + $branch->id), 4, '0', STR_PAD_LEFT)],
            ['branch_id' => $branch->id, 'bank_name' => 'CBZ Bank', 'account_name' => "Alpha Land — {$branch->name}", 'currency_code' => 'USD', 'active' => true],
        ));

        $developments = collect([
            ['code' => 'GREEN', 'name' => 'Green Valley Estates', 'location' => 'Harare North'],
            ['code' => 'RIVER', 'name' => 'Riverside Meadows', 'location' => 'Bulawayo East'],
        ])->map(function (array $data) use ($organization) {
            $development = Development::updateOrCreate(
                ['organization_id' => $organization->id, 'code' => $data['code']],
                ['name' => $data['name'], 'location' => $data['location'], 'description' => 'Serviced residential stands with road, water and power infrastructure.', 'status' => 'active'],
            );
            $phase = DevelopmentPhase::updateOrCreate(
                ['development_id' => $development->id, 'code' => 'P1'],
                ['name' => 'Phase 1', 'survey_status' => 'approved', 'planned_completion_date' => now()->addMonths(8)->endOfMonth()],
            );

            return compact('development', 'phase');
        });

        $standTypes = StandType::where('organization_id', $organization->id)->pluck('id', 'code');
        $stands = collect();
        foreach ($developments as $developmentIndex => $bundle) {
            foreach (range(1, 8) as $index) {
                $status = match (true) {
                    $index <= 4 => 'allocated',
                    $index <= 6 => 'available',
                    $index === 7 => 'reserved',
                    default => 'planned',
                };
                $stands->push(Stand::updateOrCreate(
                    ['phase_id' => $bundle['phase']->id, 'stand_no' => (string) (($developmentIndex + 1) * 100 + $index)],
                    [
                        'stand_type_id' => $standTypes[$index === 8 ? 'COMMERCIAL' : 'RESIDENTIAL'],
                        'area_sqm' => $index === 8 ? 1200 : 500 + ($index * 25),
                        'list_price' => 22000 + ($developmentIndex * 6000) + ($index * 1250),
                        'currency_code' => 'USD',
                        'physical_status' => $status,
                        'survey_reference' => "{$bundle['development']->code}-P1-{$index}",
                    ],
                ));
            }
        }

        $clientBlueprints = [
            ['CLI-1001', 'Tariro', 'Dube', 'HQ'], ['CLI-1002', 'Nyasha', 'Mlambo', 'NORTH'],
            ['CLI-1003', 'Farai', 'Chikore', 'BYO'], ['CLI-1004', 'Rutendo', 'Sibanda', 'HQ'],
            ['CLI-1005', 'Kudzai', 'Moyo', 'NORTH'], ['CLI-1006', 'Simbarashe', 'Ncube', 'BYO'],
            ['CLI-1007', 'Chipo', 'Gumbo', 'HQ'], ['CLI-1008', 'Tanaka', 'Mtetwa', 'NORTH'],
        ];
        $cashSessions = $branches->map(fn (Branch $branch) => CashSession::updateOrCreate(
            ['branch_id' => $branch->id, 'cashier_id' => $admin->id, 'opened_at' => now()->startOfDay()],
            ['opening_float' => 300, 'expected_cash' => 300, 'declared_cash' => null, 'currency_code' => 'USD', 'status' => 'open'],
        ));
        $methods = PaymentMethod::pluck('id', 'code');

        foreach ($clientBlueprints as $index => [$clientNo, $firstName, $lastName, $branchCode]) {
            $branch = $branches[$branchCode];
            $client = Client::updateOrCreate(
                ['organization_id' => $organization->id, 'client_no' => $clientNo],
                ['owning_branch_id' => $branch->id, 'first_name' => $firstName, 'last_name' => $lastName, 'search_name' => Str::lower("{$lastName} {$firstName}"), 'phone_normalized' => '+26377'.str_pad((string) (1200000 + $index), 7, '0', STR_PAD_LEFT), 'status' => 'active'],
            );
            $file = ClientFile::updateOrCreate(
                ['client_id' => $client->id, 'branch_id' => $branch->id],
                ['file_no' => "CF-{$clientNo}", 'opened_at' => now()->subMonths(8 - $index), 'lifecycle_status' => 'open', 'created_by' => $admin->id],
            );
            $standIndex = [0, 1, 2, 3, 8, 9, 10, 11][$index];
            $stand = $stands[$standIndex];
            $allocation = StandAllocation::updateOrCreate(
                ['client_file_id' => $file->id],
                ['stand_id' => $stand->id, 'branch_id' => $branch->id, 'category' => $index % 3 === 0 ? 'cash' : 'credit', 'allocated_at' => now()->subMonths(7 - min($index, 6)), 'effective_price' => (float) $stand->list_price - 500, 'currency_code' => 'USD', 'status' => 'allocated', 'created_by' => $admin->id],
            );
            $account = ClientAccount::updateOrCreate(
                ['allocation_id' => $allocation->id],
                ['client_file_id' => $file->id, 'account_no' => "ACC-{$clientNo}", 'currency_code' => 'USD', 'opened_at' => $allocation->allocated_at, 'status' => 'open'],
            );
            $chargeAmount = (float) $allocation->effective_price;
            $dueDate = now()->startOfDay()->addDays([-150, -110, -75, -45, -20, -5, 10, 30][$index]);
            $chargeDate = $dueDate->copy()->subDays(30);
            $charge = AccountCharge::updateOrCreate(
                ['account_id' => $account->id, 'charge_type' => 'stand_price'],
                ['description' => "Stand {$stand->stand_no} purchase price", 'amount' => $chargeAmount, 'currency_code' => 'USD', 'due_date' => $dueDate, 'status' => 'partially_paid', 'posted_at' => $chargeDate, 'created_by' => $admin->id],
            );
            $paymentAmount = round($chargeAmount * (0.22 + (($index % 4) * 0.06)), 2);
            $methodCode = ['BANK', 'MOBILE', 'CASH', 'CARD'][$index % 4];
            $paymentDate = $chargeDate->copy()->addDays(8);
            $payment = Payment::updateOrCreate(
                ['branch_id' => $branch->id, 'method_id' => $methods[$methodCode], 'external_reference' => "DEMO-PAY-{$clientNo}"],
                ['account_id' => $account->id, 'cash_session_id' => $methodCode === 'CASH' ? $cashSessions[$branchCode]->id : null, 'amount' => $paymentAmount, 'currency_code' => 'USD', 'received_at' => $paymentDate, 'status' => 'approved', 'made_by' => $admin->id, 'approved_by' => $admin->id, 'approved_at' => $paymentDate],
            );
            $remaining = round($chargeAmount - $paymentAmount, 2);
            $remainingCents = (int) round($remaining * 100);
            $baseCents = intdiv($remainingCents, 3);
            $remainderCents = $remainingCents % 3;
            $firstInstallment = Installment::updateOrCreate(
                ['allocation_id' => $allocation->id, 'sequence_no' => 1],
                ['due_date' => $paymentDate->toDateString(), 'amount_due' => $paymentAmount, 'amount_paid' => $paymentAmount, 'currency_code' => 'USD', 'status' => 'paid', 'paid_at' => $paymentDate, 'notes' => 'Opening installment paid at allocation.'],
            );
            foreach (range(2, 4) as $sequence) {
                $amountCents = $baseCents + (($sequence - 1) <= $remainderCents ? 1 : 0);
                $installmentDue = $dueDate->copy()->addMonthsNoOverflow($sequence - 2);
                $installment = Installment::updateOrCreate(
                    ['allocation_id' => $allocation->id, 'sequence_no' => $sequence],
                    ['due_date' => $installmentDue->toDateString(), 'amount_due' => $amountCents / 100, 'amount_paid' => 0, 'currency_code' => 'USD', 'status' => 'scheduled', 'paid_at' => null, 'notes' => 'Demo monthly installment.'],
                );
                InstallmentReminder::updateOrCreate(
                    ['installment_id' => $installment->id, 'channel' => 'in_app', 'remind_at' => $installmentDue->copy()->subDays(7)],
                    ['status' => $installmentDue->isPast() ? 'sent' : 'scheduled', 'sent_at' => $installmentDue->isPast() ? $installmentDue->copy()->subDays(7) : null, 'notes' => 'Automatic seven-day installment reminder.', 'created_by' => $admin->id],
                );
            }
            PaymentAllocation::updateOrCreate(
                ['payment_id' => $payment->id, 'charge_id' => $charge->id],
                ['installment_id' => $firstInstallment->id, 'amount' => $paymentAmount],
            );
            Receipt::updateOrCreate(
                ['payment_id' => $payment->id],
                ['organization_id' => $organization->id, 'receipt_no' => 'DEMO-RCT-'.str_pad((string) ($index + 1), 5, '0', STR_PAD_LEFT), 'issued_at' => $paymentDate, 'content_hash' => hash('sha256', "receipt-{$payment->id}"), 'qr_token_hash' => hash('sha256', "qr-{$payment->id}"), 'snapshot_json' => ['client' => "{$firstName} {$lastName}", 'amount' => $paymentAmount], 'issued_by' => $admin->id],
            );
        }

        foreach ($branches as $code => $branch) {
            $session = $cashSessions[$code];
            $cashReceived = Payment::where('cash_session_id', $session->id)->where('status', 'approved')->sum('amount');
            $session->forceFill(['expected_cash' => 300 + $cashReceived])->save();
            $bankAccount = $bankAccounts[$code];
            $deposit = BankDeposit::updateOrCreate(
                ['bank_account_id' => $bankAccount->id, 'reference' => "DEMO-DEP-{$code}"],
                ['branch_id' => $branch->id, 'deposit_date' => now()->subDay(), 'amount' => max(1000, $cashReceived), 'currency_code' => 'USD', 'status' => 'cleared', 'deposited_by' => $admin->id, 'approved_by' => $admin->id, 'cleared_at' => now()->subDay()],
            );
            ReconciliationRun::updateOrCreate(
                ['branch_id' => $branch->id, 'business_date' => now()->subDay()->toDateString(), 'run_no' => 1, 'currency_code' => 'USD'],
                ['expected_total' => $session->expected_cash, 'declared_total' => $session->expected_cash, 'deposited_total' => $deposit->amount, 'variance' => 0, 'status' => 'approved', 'prepared_by' => $admin->id, 'approved_by' => $admin->id],
            );
        }

        $categories = ExpenseCategory::where('organization_id', $organization->id)->pluck('id', 'code');
        $expenseBlueprints = [
            ['EXP-DEMO-001', 'City of Harare', 'Municipal rates for Green Valley', 1450, 'OPERATIONS', 'HQ', 5, 'approved'],
            ['EXP-DEMO-002', 'ZESA Holdings', 'Site power connection fees', 2850, 'OPERATIONS', 'NORTH', 4, 'approved'],
            ['EXP-DEMO-003', 'PrintWorks', 'Sales brochures and site signage', 780, 'SALES', 'BYO', 3, 'paid'],
            ['EXP-DEMO-004', 'RoadBuild Contractors', 'Access road grading', 4200, 'OPERATIONS', 'HQ', 2, 'approved'],
            ['EXP-DEMO-005', 'Alpha Legal Chambers', 'Conveyancing and compliance review', 1650, 'ADMIN', 'NORTH', 1, 'approved'],
            ['EXP-DEMO-006', 'OfficeMart', 'Branch stationery and supplies', 460, 'ADMIN', 'BYO', 0, 'submitted'],
            ['EXP-DEMO-007', 'SurveyPro', 'Boundary peg verification', 1220, 'OPERATIONS', 'HQ', 0, 'submitted'],
        ];

        foreach ($expenseBlueprints as $index => [$expenseNo, $payee, $purpose, $amount, $categoryCode, $branchCode, $monthsAgo, $status]) {
            $branch = $branches[$branchCode];
            $incurredAt = now()->subMonths($monthsAgo)->startOfMonth()->addDays(10 + $index);
            $expense = Expense::updateOrCreate(
                ['branch_id' => $branch->id, 'expense_no' => $expenseNo],
                ['payee' => $payee, 'currency_code' => 'USD', 'total_amount' => $amount, 'purpose' => $purpose, 'incurred_at' => $incurredAt, 'status' => $status, 'made_by' => $admin->id, 'approved_by' => in_array($status, ['approved', 'paid'], true) ? $admin->id : null, 'approved_at' => in_array($status, ['approved', 'paid'], true) ? $incurredAt->copy()->addDay() : null],
            );
            ExpenseLine::updateOrCreate(
                ['expense_id' => $expense->id],
                ['category_id' => $categories[$categoryCode], 'description' => $purpose, 'amount' => $amount, 'tax_amount' => 0],
            );
            $approvalStatus = $status === 'submitted' ? 'pending' : 'approved';
            $approval = ApprovalRequest::updateOrCreate(
                ['subject_type' => Expense::class, 'subject_id' => $expense->id, 'workflow_type' => 'expense_approval'],
                ['organization_id' => $organization->id, 'branch_id' => $branch->id, 'current_stage' => 1, 'status' => $approvalStatus, 'maker_id' => $admin->id, 'submitted_at' => $incurredAt, 'completed_at' => $approvalStatus === 'approved' ? $incurredAt->copy()->addDay() : null],
            );
            $step = ApprovalStep::updateOrCreate(
                ['approval_request_id' => $approval->id, 'sequence_no' => 1],
                ['required_role_id' => $managerRole->id, 'threshold_min' => $amount, 'threshold_currency' => 'USD', 'status' => $approvalStatus, 'assigned_user_id' => $approvalStatus === 'approved' ? $admin->id : null, 'completed_at' => $approvalStatus === 'approved' ? $incurredAt->copy()->addDay() : null],
            );
            WorkflowAction::updateOrCreate(
                ['approval_request_id' => $approval->id, 'action' => $approvalStatus === 'approved' ? 'approved' : 'submitted'],
                ['approval_step_id' => $step->id, 'actor_id' => $admin->id, 'note' => $approvalStatus === 'approved' ? 'Approved within policy.' : 'Submitted for branch manager review.', 'acted_at' => $approvalStatus === 'approved' ? $incurredAt->copy()->addDay() : $incurredAt],
            );
            $expense->forceFill(['approval_request_id' => $approval->id])->save();
        }

        foreach ($branches as $code => $branch) {
            PettyCashEntry::updateOrCreate(
                ['branch_id' => $branch->id, 'expense_id' => null, 'entry_type' => 'replenishment'],
                ['cash_session_id' => $cashSessions[$code]->id, 'amount' => 1500, 'currency_code' => 'USD', 'posted_at' => now()->subMonths(2), 'posted_by' => $admin->id],
            );
        }
        Expense::query()->whereIn('status', ['approved', 'paid'])->limit(4)->get()->each(function (Expense $expense) use ($cashSessions, $branches, $admin) {
            $branchCode = $branches->firstWhere('id', $expense->branch_id)?->code ?? 'HQ';
            PettyCashEntry::updateOrCreate(
                ['branch_id' => $expense->branch_id, 'expense_id' => $expense->id, 'entry_type' => 'disbursement'],
                ['cash_session_id' => $cashSessions[$branchCode]->id, 'amount' => min((float) $expense->total_amount, 500), 'currency_code' => $expense->currency_code, 'posted_at' => $expense->approved_at ?? now(), 'posted_by' => $admin->id],
            );
        });

        foreach ([
            ['portfolio_snapshot', Stand::count()],
            ['receivables_snapshot', AccountCharge::count()],
            ['collections_snapshot', Payment::count()],
            ['expense_snapshot', Expense::count()],
        ] as [$dataset, $rowCount]) {
            ReportRefreshLog::updateOrCreate(
                ['dataset_name' => $dataset, 'watermark_to' => now()->startOfDay()],
                ['started_at' => now()->subMinutes(12), 'completed_at' => now()->subMinutes(10), 'watermark_from' => now()->subDay()->startOfDay(), 'row_count' => $rowCount, 'status' => 'completed'],
            );
        }
    }
}
