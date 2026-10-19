<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class SmsSender
{
    /** @return array{status:string, provider_message_id:?string} */
    public function send(string $phone, string $message): array
    {
        if (! config('services.twilio.enabled')) {
            Log::info('SMS delivery simulated because Twilio is disabled.', [
                'recipient' => Str::mask($phone, '*', 0, max(0, mb_strlen($phone) - 4)),
                'characters' => mb_strlen($message),
            ]);

            return ['status' => 'simulated', 'provider_message_id' => null];
        }

        $accountSid = (string) config('services.twilio.account_sid');
        $authToken = (string) config('services.twilio.auth_token');
        $from = (string) config('services.twilio.from');

        if ($accountSid === '' || $authToken === '' || $from === '') {
            throw new RuntimeException('Twilio SMS is enabled but its credentials or sender are not configured.');
        }

        $response = Http::asForm()
            ->withBasicAuth($accountSid, $authToken)
            ->timeout((int) config('services.twilio.timeout', 10))
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json", [
                'To' => $phone,
                'From' => $from,
                'Body' => $message,
                'StatusCallback' => route('webhooks.twilio.status'),
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Twilio rejected the SMS request with HTTP '.$response->status().'.');
        }

        return [
            'status' => 'sent',
            'provider_message_id' => $response->json('sid'),
        ];
    }
}
