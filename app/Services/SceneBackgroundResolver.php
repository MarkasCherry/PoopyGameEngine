<?php

namespace App\Services;

use App\Models\Scene;
use Illuminate\Support\Collection;

class SceneBackgroundResolver
{
    /**
     * Resolve the background each scene shows when it starts, honoring:
     * own background > carry-over from the previous playable scene > the
     * nearest ancestor group's background on first entry.
     *
     * @param  Collection<int, Scene>  $scenes  all scenes of one game
     * @return array<int, string|null> scene id => asset path
     */
    public function resolve(Collection $scenes): array
    {
        $byParent = $scenes->groupBy(fn (Scene $scene) => $scene->parent_id ?? 0);
        $resolved = [];
        $current = null;

        $walk = function (?int $parentId, ?string $groupDefault) use (&$walk, &$resolved, &$current, $byParent) {
            foreach ($byParent->get($parentId ?? 0, collect())->sortBy('position') as $scene) {
                $own = $scene->background['asset_path'] ?? null;

                if ($scene->is_group) {
                    if ($own !== null) {
                        $current = $own;
                    }

                    $resolved[$scene->id] = $own ?? $groupDefault ?? $current;
                    $walk($scene->id, $own ?? $groupDefault);

                    continue;
                }

                $current = $own ?? $current ?? $groupDefault;
                $resolved[$scene->id] = $current;
            }
        };

        $walk(null, null);

        return $resolved;
    }
}
