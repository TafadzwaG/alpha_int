<?php

namespace App\Jobs;

use App\Models\SmsCampaign;
use App\Models\SmsRecipient;
use App\Services\SmsSender;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Throwable;

class SendSmsRecipient implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [10, 60, 180];

    public function __construct(public readonly int $recipientId) {}

    public function handle(SmsSender $sender): void
    {
        $recipient = SmsRecipient::query()->with('campaign')->findOrFail($this->recipientId);
        if ($recipient->status !== 'queued') {
            return;
        }

        $recipient->increment('attempts');

        try {
            $result = $sender->send($recipient->phone, $recipient->campaign->message);
            $recipient->forceFill([
                'status' => $result['status'],
                'provider_message_id' => $result['provider_message_id'],
                'error_message' => null,
                'sent_at' => now(),
            ])->save();
            $this->refreshCampaign($recipient->campaign);
        } catch (Throwable $exception) {
            if ($this->attempts() < $this->tries) {
                throw $exception;
            }

            $recipient->forceFill([
                'status' => 'failed',
                'error_message' => mb_substr($exception->getMessage(), 0, 1000),
            ])->save();
            $this->refreshCampaign($recipient->campaign);
        }
    }

    private function refreshCampaign(SmsCampaign $campaign): void
    {
        DB::transaction(function () use ($campaign) {
            $locked = SmsCampaign::query()->lockForUpdate()->findOrFail($campaign->id);
            $counts = $locked->recipients()
                ->selectRaw('status, COUNT(*) as aggregate')
                ->groupBy('status')
                ->pluck('aggregate', 'status');
            $processed = (int) ($counts['sent'] ?? 0) + (int) ($counts['simulated'] ?? 0) + (int) ($counts['failed'] ?? 0);
            $locked->forceFill([
                'sent_count' => (int) ($counts['sent'] ?? 0),
                'simulated_count' => (int) ($counts['simulated'] ?? 0),
                'failed_count' => (int) ($counts['failed'] ?? 0),
                'status' => $processed >= $locked->recipient_count ? ((int) ($counts['failed'] ?? 0) > 0 ? 'completed_with_errors' : 'completed') : 'processing',
                'completed_at' => $processed >= $locked->recipient_count ? now() : null,
            ])->save();
        });
    }
}
