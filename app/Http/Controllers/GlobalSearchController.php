<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Client;
use App\Models\Development;
use App\Models\Stand;
use App\Models\StandAllocation;
use App\Models\User;
use App\Services\BranchAccessService;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    public function __invoke(Request $request, BranchAccessService $access)
    {
        $validated = $request->validate(['q' => ['required', 'string', 'min:2', 'max:120']]);
        $term = trim($validated['q']);
        if (mb_strlen($term) < 2) {
            return response()->json(['groups' => []]);
        }
        $user = $request->user();
        $organization = $user->organization_id;
        $branches = $access->branchIds($user);
        $groups = [];
        $administration = $user->can('phase-one.view');
        if ($administration || $user->can('call-centre.view')) {
            $clients = Client::where('organization_id', $organization)->when($branches !== null, fn ($q) => $q->whereIn('owning_branch_id', $branches))->with('owningBranch:id,name');
            foreach (preg_split('/\s+/', $term) as $word) {
                $clients->where(fn ($q) => $q->where('client_no', 'like', "%{$word}%")->orWhere('first_name', 'like', "%{$word}%")->orWhere('middle_names', 'like', "%{$word}%")->orWhere('last_name', 'like', "%{$word}%")->orWhere('phone_normalized', 'like', "%{$word}%"));
            }
            $groups[] = ['label' => 'Clients', 'items' => $clients->orderBy('last_name')->limit(12)->get()->map(fn ($client) => [
                'id' => $client->id,
                'title' => trim($client->first_name.' '.$client->last_name),
                'detail' => implode(' | ', array_filter([$client->client_no, $client->phone_normalized, $client->owningBranch?->name])),
                'url' => ($administration ? '/administration' : '/call-centre').'/clients/'.$client->id,
                'documents' => $administration ? [
                    ['label' => 'Print receipts', 'url' => "/administration/clients/{$client->id}/receipts/print", 'kind' => 'print_receipts'],
                    ['label' => 'Download receipts', 'url' => "/administration/clients/{$client->id}/receipts/pdf", 'kind' => 'download_receipts'],
                    ['label' => 'Print statement', 'url' => "/administration/clients/{$client->id}/statement/print", 'kind' => 'print_statement'],
                    ['label' => 'Download statement', 'url' => "/administration/clients/{$client->id}/statement/pdf", 'kind' => 'download_statement'],
                ] : [],
            ])];
        }
        if ($administration) {
            $stands = Stand::whereHas('phase.development', fn ($q) => $q->where('organization_id', $organization))->where(fn ($q) => $q->where('stand_no', 'like', "%{$term}%")->orWhereHas('phase.development', fn ($d) => $d->where('name', 'like', "%{$term}%")))->with('phase.development:id,name');
            $groups[] = ['label' => 'Stands', 'items' => $stands->limit(8)->get()->map(fn ($stand) => ['id' => $stand->id, 'title' => 'Stand '.$stand->stand_no, 'detail' => $stand->phase?->development?->name.' | '.$stand->physical_status, 'url' => '/administration/stands/'.$stand->id])];
            $allocations = StandAllocation::whereHas('clientFile.client', fn ($q) => $q->where('organization_id', $organization))->when($branches !== null, fn ($q) => $q->whereIn('branch_id', $branches))->where(fn ($q) => $q->whereHas('stand', fn ($s) => $s->where('stand_no', 'like', "%{$term}%"))->orWhereHas('clientFile.client', fn ($c) => $c->where('first_name', 'like', "%{$term}%")->orWhere('last_name', 'like', "%{$term}%")->orWhere('client_no', 'like', "%{$term}%")))->with(['stand', 'clientFile.client', 'branch']);
            $groups[] = ['label' => 'Allocations', 'items' => $allocations->limit(6)->get()->map(fn ($a) => ['id' => $a->id, 'title' => trim($a->clientFile?->client?->first_name.' '.$a->clientFile?->client?->last_name).' / Stand '.$a->stand?->stand_no, 'detail' => $a->branch?->name.' | '.$a->status, 'url' => '/administration/stand-allocations/'.$a->id])];
            $groups[] = ['label' => 'Users', 'items' => User::where('organization_id', $organization)->where(fn ($q) => $q->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"))->limit(6)->get()->map(fn ($u) => ['id' => $u->id, 'title' => $u->name, 'detail' => $u->email, 'url' => '/administration/users/'.$u->id])];
            $groups[] = ['label' => 'Branches', 'items' => Branch::where('organization_id', $organization)->when($branches !== null, fn ($q) => $q->whereIn('id', $branches))->where(fn ($q) => $q->where('name', 'like', "%{$term}%")->orWhere('code', 'like', "%{$term}%"))->limit(6)->get()->map(fn ($b) => ['id' => $b->id, 'title' => $b->name, 'detail' => $b->code, 'url' => '/administration/branches/'.$b->id])];
            $groups[] = ['label' => 'Developments', 'items' => Development::where('organization_id', $organization)->where('name', 'like', "%{$term}%")->limit(6)->get()->map(fn ($d) => ['id' => $d->id, 'title' => $d->name, 'detail' => $d->location, 'url' => '/administration/developments?search='.urlencode($d->name)])];
        }

        return response()->json(['groups' => $groups]);
    }
}
