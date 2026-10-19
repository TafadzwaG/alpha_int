<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MfaAndTwilioSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_mfa_required_user_is_challenged_before_entering_the_application(): void
    {
        Mail::fake();
        $user = User::factory()->create(['mfa_state' => 'required', 'status' => 'active']);

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect(route('mfa.challenge', absolute: false));
        $this->get('/mfa-challenge')->assertOk();
        $this->assertDatabaseHas('user_mfa_challenges', ['user_id' => $user->id, 'consumed_at' => null]);
        $this->get('/select-branch')->assertRedirect(route('mfa.challenge', absolute: false));
    }

    public function test_signed_twilio_stop_message_opts_client_out(): void
    {
        $this->seed(DatabaseSeeder::class);
        config(['services.twilio.auth_token' => 'test-token', 'services.twilio.webhook_base_url' => 'http://localhost']);
        $client = Client::query()->whereNotNull('phone_normalized')->firstOrFail();
        $client->forceFill(['sms_consent' => true, 'sms_consent_at' => now(), 'sms_opted_out_at' => null])->save();
        $parameters = ['From' => $client->phone_normalized, 'Body' => 'STOP'];
        ksort($parameters);
        $payload = 'http://localhost/webhooks/twilio/inbound';
        foreach ($parameters as $key => $value) {
            $payload .= $key.$value;
        }
        $signature = base64_encode(hash_hmac('sha1', $payload, 'test-token', true));

        $this->withHeader('X-Twilio-Signature', $signature)->post('/webhooks/twilio/inbound', $parameters)->assertOk();

        $client->refresh();
        $this->assertFalse($client->sms_consent);
        $this->assertNotNull($client->sms_opted_out_at);
    }
}
