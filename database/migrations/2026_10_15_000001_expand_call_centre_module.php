<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_centre_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('campaign_type', 40);
            $table->string('aging_bucket', 30)->nullable();
            $table->text('description')->nullable();
            $table->string('status', 30)->default('draft');
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps(6);
            $table->index(['organization_id', 'status', 'starts_on']);
            $table->index(['branch_id', 'campaign_type']);
        });

        Schema::table('client_interactions', function (Blueprint $table) {
            $table->foreignId('campaign_id')->nullable()->after('branch_id')->constrained('call_centre_campaigns')->nullOnDelete();
            $table->string('direction', 20)->default('outbound')->after('campaign_id');
            $table->string('channel', 30)->default('phone')->after('direction');
            $table->unsignedInteger('duration_seconds')->nullable()->after('occurred_at');
            $table->index(['branch_id', 'occurred_at']);
            $table->index(['created_by', 'occurred_at']);
            $table->index(['campaign_id', 'outcome']);
        });

        Schema::table('follow_up_tasks', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->after('client_id')->constrained()->nullOnDelete();
            $table->string('task_type', 40)->default('callback')->after('source_interaction_id');
            $table->string('reference_type')->nullable()->after('task_type');
            $table->unsignedBigInteger('reference_id')->nullable()->after('reference_type');
            $table->timestamp('reminder_sent_at', 6)->nullable()->after('completed_by');
            $table->timestamp('escalated_at', 6)->nullable()->after('reminder_sent_at');
            $table->index(['branch_id', 'status', 'due_at']);
            $table->index(['reference_type', 'reference_id']);
        });

        DB::table('follow_up_tasks')->orderBy('id')->each(function ($task) {
            $branchId = DB::table('clients')->where('id', $task->client_id)->value('owning_branch_id');
            if ($branchId) {
                DB::table('follow_up_tasks')->where('id', $task->id)->update(['branch_id' => $branchId]);
            }
        });

        Schema::create('call_centre_campaign_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('call_centre_campaigns')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('last_interaction_id')->nullable()->constrained('client_interactions')->nullOnDelete();
            $table->string('status', 30)->default('queued');
            $table->string('priority', 20)->default('normal');
            $table->timestamps(6);
            $table->unique(['campaign_id', 'client_id']);
            $table->index(['assigned_to', 'status']);
        });

        Schema::create('promises_to_pay', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('interaction_id')->nullable()->constrained('client_interactions')->nullOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('client_accounts')->nullOnDelete();
            $table->decimal('promised_amount', 19, 4);
            $table->char('currency_code', 3);
            $table->date('due_date');
            $table->string('status', 30)->default('open');
            $table->timestamp('fulfilled_at', 6)->nullable();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('breach_notified_at', 6)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps(6);
            $table->index(['branch_id', 'status', 'due_date']);
            $table->index(['client_id', 'status']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('promises_to_pay');
        Schema::dropIfExists('call_centre_campaign_members');

        Schema::table('follow_up_tasks', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropIndex(['branch_id', 'status', 'due_at']);
            $table->dropIndex(['reference_type', 'reference_id']);
            $table->dropColumn(['branch_id', 'task_type', 'reference_type', 'reference_id', 'reminder_sent_at', 'escalated_at']);
        });

        Schema::table('client_interactions', function (Blueprint $table) {
            $table->dropForeign(['campaign_id']);
            $table->dropIndex(['branch_id', 'occurred_at']);
            $table->dropIndex(['created_by', 'occurred_at']);
            $table->dropIndex(['campaign_id', 'outcome']);
            $table->dropColumn(['campaign_id', 'direction', 'channel', 'duration_seconds']);
        });

        Schema::dropIfExists('call_centre_campaigns');
    }
};
