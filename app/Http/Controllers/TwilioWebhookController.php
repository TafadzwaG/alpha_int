<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\SmsRecipient;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TwilioWebhookController extends Controller
{
    public function status(Request $request): Response
    {
        $this->verifySignature($request);
        $recipient = SmsRecipient::query()->where('provider_message_id', $request->string('MessageSid'))->first();
        if ($recipient) {
            $status = $request->string('MessageStatus')->toString();
            $recipient->forceFill([
                'provider_status' => $status,
                'delivered_at' => $status === 'delivered' ? now() : $recipient->delivered_at,
                'error_message' => in_array($status, ['failed', 'undelivered'], true)
                    ? trim($request->string('ErrorCode').' '.$request->string('ErrorMessage'))
                    : $recipient->error_message,
            ])->save();
        }

        return response('', 204);
    }

    public function inbound(Request $request): Response
    {
        $this->verifySignature($request);
        $body = strtoupper(trim($request->string('Body')->toString()));
        if (in_array($body, ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'], true)) {
            Client::query()->where('phone_normalized', $request->string('From')->toString())->update([
                'sms_consent' => false,
                'sms_consent_at' => null,
                'sms_opted_out_at' => now(),
            ]);
        }

        return response('<?xml version="1.0" encoding="UTF-8"?><Response/>', 200, ['Content-Type' => 'text/xml']);
    }

    private function verifySignature(Request $request): void
    {
        $token = (string) config('services.twilio.auth_token');
        abort_if($token === '', 503, 'Twilio webhook verification is not configured.');
        $url = rtrim((string) (config('services.twilio.webhook_base_url') ?: $request->getSchemeAndHttpHost()), '/').'/'.$request->path();
        $parameters = $request->post();
        ksort($parameters);
        $payload = $url;
        foreach ($parameters as $key => $value) {
            $payload .= $key.(is_array($value) ? implode('', $value) : $value);
        }
        $expected = base64_encode(hash_hmac('sha1', $payload, $token, true));
        abort_unless(hash_equals($expected, (string) $request->header('X-Twilio-Signature')), 403);
    }
}
