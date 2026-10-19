<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stand_legal_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stand_id')->constrained()->cascadeOnDelete();
            $table->string('case_number', 80);
            $table->string('title');
            $table->string('case_type', 40)->default('other');
            $table->string('status', 30)->default('open');
            $table->string('priority', 20)->default('medium');
            $table->string('court_name')->nullable();
            $table->string('opposing_party')->nullable();
            $table->date('opened_on')->nullable();
            $table->date('next_hearing_on')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->text('summary')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['organization_id', 'case_number']);
            $table->index(['stand_id', 'status']);
        });

        Schema::create('stand_legal_case_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stand_legal_case_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('stand_legal_case_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stand_legal_case_id')->constrained()->cascadeOnDelete();
            $table->string('disk', 30)->default('local');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stand_legal_case_files');
        Schema::dropIfExists('stand_legal_case_notes');
        Schema::dropIfExists('stand_legal_cases');
    }
};
