<?php

namespace App\Http\Controllers;

use App\Services\PhaseOneResourceRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PhaseOneResourceController extends Controller
{
    public function __construct(private readonly PhaseOneResourceRegistry $registry) {}

    public function index(string $resource, Request $request): Response
    {
        if (in_array($resource, ['expenses', 'petty-cash-entries'], true)) {
            abort_unless($request->user()->can('expenses.view'), 403);
        }
        if ($resource === 'audit-events') {
            abort_unless($request->user()->can('audit.view'), 403);
        }

        return Inertia::render('administration/resource', $this->registry->page($resource, $request));
    }

    public function store(string $resource, Request $request): RedirectResponse
    {
        $permission = in_array($resource, ['expenses', 'petty-cash-entries'], true) ? 'expenses.manage' : 'phase-one.manage';
        abort_unless($request->user()->can($permission), 403);
        $this->registry->create($resource, $request);

        return back()->with('success', 'Record created successfully.');
    }

    public function update(string $resource, string $record, Request $request): RedirectResponse
    {
        $permission = in_array($resource, ['expenses', 'petty-cash-entries'], true) ? 'expenses.manage' : 'phase-one.manage';
        abort_unless($request->user()->can($permission), 403);
        $this->registry->update($resource, $record, $request);

        return back()->with('success', 'Record updated successfully.');
    }

    public function destroy(string $resource, string $record, Request $request): RedirectResponse
    {
        $permission = in_array($resource, ['expenses', 'petty-cash-entries'], true) ? 'expenses.manage' : 'phase-one.manage';
        abort_unless($request->user()->can($permission), 403);
        $this->registry->remove($resource, $record, $request);

        return back()->with('success', 'Record removed from active use.');
    }
}
