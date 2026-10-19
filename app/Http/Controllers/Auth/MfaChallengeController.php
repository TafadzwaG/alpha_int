<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\UserMfaChallenge;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MfaChallengeController extends Controller
{
    public function show(Request $request): Response
    {
        if (! in_array($request->user()->mfa_state, ['required', 'enabled'], true)) {
            return Inertia::render('auth/mfa-challenge', ['required' => false]);
        }

        if (! $request->session()->has('mfa_challenge_id')) {
            $this->issue($request);
        }

        return Inertia::render('auth/mfa-challenge', [
            'required' => true,
            'emailHint' => preg_replace('/(^.).*(@.*$)/', '$1***$2', $request->user()->email),
        ]);
    }

    public function verify(Request $request): RedirectResponse
    {
        $validated = $request->validate(['code' => ['required', 'digits:6']]);
        $challenge = UserMfaChallenge::query()->whereKey($request->session()->get('mfa_challenge_id'))
            ->where('user_id', $request->user()->id)->whereNull('consumed_at')->first();
        if (! $challenge || $challenge->expires_at->isPast() || $challenge->attempts >= 5 || ! Hash::check($validated['code'], $challenge->code_hash)) {
            $challenge?->increment('attempts');
            throw ValidationException::withMessages(['code' => 'The verification code is invalid or has expired.']);
        }

        $challenge->forceFill(['consumed_at' => now()])->save();
        $request->session()->put('mfa_passed_for', $request->user()->id);
        $request->session()->forget('mfa_challenge_id');

        return to_route('branch-selection.index');
    }

    public function resend(Request $request): RedirectResponse
    {
        $this->issue($request);

        return back()->with('status', 'A new verification code was sent.');
    }

    private function issue(Request $request): void
    {
        UserMfaChallenge::query()->where('user_id', $request->user()->id)->whereNull('consumed_at')->update(['consumed_at' => now()]);
        $code = (string) random_int(100000, 999999);
        $challenge = UserMfaChallenge::query()->create([
            'user_id' => $request->user()->id,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(10),
        ]);
        $request->session()->put('mfa_challenge_id', $challenge->id);
        Mail::raw("Your Alpha Land verification code is {$code}. It expires in 10 minutes.", fn ($message) => $message
            ->to($request->user()->email)
            ->subject('Alpha Land sign-in verification code'));
    }
}
