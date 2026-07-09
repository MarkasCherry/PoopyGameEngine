<?php

namespace App\Services;

use App\Models\Scene;
use Illuminate\Support\Collection;

class SceneMusicResolver
{
    /**
     * Resolve the background music each scene plays while it is on screen.
     * A scene's own audio wins; otherwise the nearest ancestor group's audio
     * applies — a chapter's track plays through every scene inside it, a
     * child override lasts only for its own scope, and the parent track
     * resumes as soon as that scope ends.
     *
     * @param  Collection<int, Scene>  $scenes  all scenes of one game
     * @return array<int, array{asset_path: string, loop: bool, volume: float}|null> scene id => track (null = silence)
     */
    public function resolve(Collection $scenes): array
    {
        $byId = $scenes->keyBy('id');
        $resolved = [];

        foreach ($scenes as $scene) {
            $resolved[$scene->id] = $this->effective($scene, $byId);
        }

        return $resolved;
    }

    private function effective(Scene $scene, Collection $byId): ?array
    {
        for ($current = $scene; $current !== null; $current = $current->parent_id !== null ? $byId->get($current->parent_id) : null) {
            $audio = $current->audio;

            if ($audio === null) {
                continue;
            }

            if (($audio['action'] ?? null) === 'play' && ($audio['asset_path'] ?? null)) {
                return [
                    'asset_path' => $audio['asset_path'],
                    'loop' => (bool) ($audio['loop'] ?? true),
                    'volume' => (float) ($audio['volume'] ?? 1),
                ];
            }

            return null;
        }

        return null;
    }
}
