<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\FollowUpTask;
use App\Models\Payment;
use App\Services\BranchAccessService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $branch = app(BranchAccessService::class)->availableBranches($user)
            ->firstWhere('id', (int) $request->session()->get(BranchAccessService::SESSION_KEY));
        abort_unless($branch, 403);
        $cards = [];
        $actions = [];
        $items = [];
        $title = 'My dashboard';
        $description = 'Your available workspaces and current activity.';

        if ($user->hasRole('Auditor') && $user->can('audit.view')) {
            $title = 'Audit dashboard';
            $description = 'Review recorded changes, financial controls and management reports.';
            $events = AuditEvent::where('organization_id', $user->organization_id)->where('branch_id', $branch->id);
            $cards = [
                ['label' => 'Events today', 'value' => (clone $events)->whereDate('occurred_at', today())->count(), 'icon' => 'audit'],
                ['label' => 'Events in last 30 days', 'value' => (clone $events)->where('occurred_at', '>=', now()->subDays(30))->count(), 'icon' => 'activity'],
            ];
            $items = (clone $events)->latest('occurred_at')->limit(8)->get()->map(fn ($event) => [
                'title' => $event->event_type, 'detail' => $event->occurred_at?->format('d M Y, H:i'),
            ])->all();
            if ($user->can('phase-one.view')) {
                $actions[] = ['label' => 'Audit log', 'href' => '/administration/audit-events', 'icon' => 'audit'];
                if ($user->can('reports.view')) {
                    $actions[] = ['label' => 'Management reports', 'href' => '/reports', 'icon' => 'activity'];
                }
                if ($user->can('accounting.view')) {
                    $actions[] = ['label' => 'Accounting review', 'href' => '/accounting', 'icon' => 'payments'];
                }
            }
        } elseif ($user->hasRole('Cashier') && $user->can('phase-one.view')) {
            $title = 'Cashier dashboard';
            $description = 'Track your cash sessions and review branch payments awaiting processing.';
            $sessions = CashSession::where('branch_id', $branch->id)->where('cashier_id', $user->id);
            $payments = Payment::where('branch_id', $branch->id);
            $cards = [
                ['label' => 'My open cash sessions', 'value' => (clone $sessions)->where('status', 'open')->count(), 'icon' => 'cash'],
                ['label' => 'Branch payments today', 'value' => (clone $payments)->whereDate('received_at', today())->count(), 'icon' => 'payments'],
                ['label' => 'Branch payments awaiting approval', 'value' => (clone $payments)->where('status', 'pending')->count(), 'icon' => 'clock'],
            ];
            $actions = [
                ['label' => 'Payments', 'href' => '/administration/payments', 'icon' => 'payments'],
                ['label' => 'Cash sessions', 'href' => '/administration/cash-sessions', 'icon' => 'cash'],
                ['label' => 'Receipts', 'href' => '/administration/receipts', 'icon' => 'audit'],
            ];
            $items = (clone $sessions)->latest('opened_at')->limit(6)->get()->map(fn ($session) => [
                'title' => 'Cash session #'.$session->id.' · '.$session->status,
                'detail' => $session->currency_code.' · '.$session->opened_at?->format('d M Y, H:i'),
            ])->all();
        } elseif ($user->hasRole('Sales Officer') && $user->can('call-centre.view')) {
            $title = 'Sales dashboard';
            $description = 'Your client follow-ups, prospects and scheduled conversations.';
            $clients = Client::where('organization_id', $user->organization_id)->where('owning_branch_id', $branch->id);
            $tasks = FollowUpTask::where('branch_id', $branch->id)->where('assigned_to', $user->id)->whereIn('status', ['open', 'in_progress']);
            $cards = [
                ['label' => 'Branch prospects', 'value' => (clone $clients)->where('status', 'prospect')->count(), 'icon' => 'clients'],
                ['label' => 'My open follow-ups', 'value' => (clone $tasks)->count(), 'icon' => 'phone'],
                ['label' => 'My overdue follow-ups', 'value' => (clone $tasks)->where('due_at', '<', now())->count(), 'icon' => 'clock'],
            ];
            $actions = [
                ['label' => 'My work queue', 'href' => '/call-centre/queue', 'icon' => 'phone'],
                ['label' => 'Find a client', 'href' => '/call-centre', 'icon' => 'clients'],
            ];
            $items = (clone $tasks)->with('client')->orderBy('due_at')->limit(8)->get()->map(fn ($task) => [
                'title' => trim($task->client?->first_name.' '.$task->client?->last_name),
                'detail' => $task->due_at?->format('d M Y, H:i').' · '.$task->priority,
            ])->all();
        }

        return Inertia::render('role-dashboard', compact('title', 'description', 'cards', 'actions', 'items') + [
            'branch' => $branch->name,
        ]);
    }
}
