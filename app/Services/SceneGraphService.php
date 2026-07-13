<?php

namespace App\Services;

use App\Models\Game;
use App\Models\Scene;

class SceneGraphService
{
    public function __construct(
        private SceneBackgroundResolver $backgrounds,
        private SceneMusicResolver $music,
    ) {}

    /**
     * Flow map of a game: every scene with its visual preview data,
     * plus the choice edges connecting scenes.
     */
    public function map(Game $game): array
    {
        $scenes = $game->scenes()->orderBy('position')->get();
        $backgrounds = $this->backgrounds->resolve($scenes);
        $music = $this->music->resolve($scenes);
        $edges = [];

        foreach ($scenes as $scene) {
            if ($scene->type !== 'choice') {
                continue;
            }

            foreach ($scene->data['options'] ?? [] as $option) {
                if (! empty($option['target_scene_id'])) {
                    $edges[] = [
                        'from' => $scene->id,
                        'to' => (int) $option['target_scene_id'],
                        'label' => $option['text'] ?? '',
                    ];
                }
            }
        }

        return [
            'scenes' => $scenes->map(fn (Scene $scene) => [
                'id' => $scene->id,
                'title' => $scene->title,
                'parent_id' => $scene->parent_id,
                'is_group' => $scene->is_group,
                'type' => $scene->type,
                'position' => $scene->position,
                'background' => $backgrounds[$scene->id] ?? null,
                'resolved_music' => $music[$scene->id] ?? null,
                'speakers' => $scene->type === 'dialogue' && ! empty($scene->data['character_id'])
                    ? [$scene->data['character_id']]
                    : [],
            ])->values()->all(),
            'edges' => $edges,
        ];
    }
}
