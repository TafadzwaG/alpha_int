<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMfaCompleted
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || ! in_array($request->user()->mfa_state, ['required', 'enabled'], true)) {
            return $next($request);
        }
        if ($request->routeIs('mfa.*', 'logout', 'verification.*') || (int) $request->session()->get('mfa_passed_for') === (int) $request->user()->id) {
            return $next($request);
        }

        return redirect()->route('mfa.challenge');
    }
}
