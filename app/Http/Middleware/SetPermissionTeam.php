<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetPermissionTeam
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->organization_id) {
            setPermissionsTeamId($request->user()->organization_id);
        }

        return $next($request);
    }
}
