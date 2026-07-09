<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appearances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scene_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('scope')->default('global');
            $table->boolean('is_default')->default(false);
            $table->string('image_path')->nullable();
            $table->string('display_name')->nullable();
            $table->string('text_color')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['character_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appearances');
    }
};
