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
            $table->string('type')->nullable()->after('is_group');
            $table->json('data')->nullable()->after('title');
            $table->json('background')->nullable()->after('data');
            $table->json('audio')->nullable()->after('background');
            $table->json('effects')->nullable()->after('audio');
            $table->boolean('auto_advance')->default(false)->after('effects');
            $table->unsignedInteger('auto_advance_delay_ms')->nullable()->after('auto_advance');
        });

        foreach (DB::table('scenes')->whereNotNull('default_background')->get() as $scene) {
            DB::table('scenes')->where('id', $scene->id)->update([
                'background' => json_encode(['asset_path' => $scene->default_background, 'transition' => 'fade']),
            ]);
        }

        $nodes = Schema::hasTable('nodes')
            ? DB::table('nodes')->orderBy('scene_id')->orderBy('position')->get()
            : collect();

        foreach ($nodes->groupBy('scene_id') as $sceneId => $sceneNodes) {
            $parent = DB::table('scenes')->find($sceneId);
            if (! $parent) {
                continue;
            }

            DB::table('scenes')->where('id', $sceneId)->update(['is_group' => true]);
            $offset = (int) (DB::table('scenes')->where('parent_id', $sceneId)->max('position') ?? -1) + 1;

            foreach ($sceneNodes->values() as $i => $node) {
                $data = json_decode($node->data, true) ?? [];
                $title = match ($node->type) {
                    'dialogue' => mb_substr($data['text'] ?? '', 0, 40) ?: 'Line '.($i + 1),
                    'choice' => $data['prompt'] ?? 'Choice',
                    'video' => 'Video',
                    default => 'Scene '.($i + 1),
                };

                DB::table('scenes')->insert([
                    'game_id' => $parent->game_id,
                    'parent_id' => $sceneId,
                    'is_group' => false,
                    'type' => $node->type,
                    'title' => $title,
                    'data' => $node->data,
                    'background' => $node->background,
                    'audio' => $node->audio,
                    'effects' => $node->effects,
                    'auto_advance' => $node->auto_advance,
                    'auto_advance_delay_ms' => $node->auto_advance_delay_ms,
                    'position' => $offset + $i,
                    'created_at' => $node->created_at,
                    'updated_at' => $node->updated_at,
                ]);
            }
        }

        Schema::table('scenes', function (Blueprint $table) {
            $table->dropColumn('default_background');
        });

        Schema::dropIfExists('nodes');
    }

    public function down(): void
    {
        // One-way data merge; restoring the nodes table is not supported.
    }
};
