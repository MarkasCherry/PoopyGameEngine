<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scenes', function (Blueprint $table) {
            $table->boolean('is_group')->default(false)->after('parent_id');
            $table->string('default_background')->nullable()->after('title');
        });

        DB::table('scenes')
            ->whereIn('id', DB::table('scenes')->whereNotNull('parent_id')->pluck('parent_id'))
            ->update(['is_group' => true]);
    }

    public function down(): void
    {
        Schema::table('scenes', function (Blueprint $table) {
            $table->dropColumn(['is_group', 'default_background']);
        });
    }
};
