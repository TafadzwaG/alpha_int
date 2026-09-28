<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdministrationController extends Controller
{
    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;
        $canViewAudit = $request->user()->can('audit.view');

        return Inertia::render('administration/index', [
            'summary' => [
                'branches' => Branch::query()->where('organization_id', $organizationId)->count(),
                'users' => User::query()->where('organization_id', $organizationId)->count(),
                'roles' => Role::query()->where('organization_id', $organizationId)->count(),
                'auditEvents' => $canViewAudit ? AuditEvent::query()->where('organization_id', $organizationId)->count() : null,
            ],
            'canViewAudit' => $canViewAudit,
            'recentEvents' => $canViewAudit
                ? AuditEvent::query()
                    ->where('organization_id', $organizationId)
                    ->with('actor:id,name')
                    ->latest('occurred_at')
                    ->limit(6)
                    ->get()
                    ->map(fn (AuditEvent $event) => [
                        'id' => $event->id,
                        'event_type' => $event->event_type,
                        'subject' => "{$event->subject_type} #{$event->subject_id}",
                        'actor' => $event->actor?->name ?? 'System',
                        'occurred_at' => $event->occurred_at?->toIso8601String(),
                    ])
                : [],
        ]);
    }
}
