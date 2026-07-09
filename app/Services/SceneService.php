<?php

namespace App\Services;

use App\Models\Game;
use App\Models\Scene;
use App\Nodes\NodeTypeRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SceneService
{
    public function __construct(private NodeTypeRegistry $registry) {}

    public function create(Game $game, array $attributes): Scene
    {
        $parentId = $attributes['parent_id'] ?? null;
        $isGroup = (bool) ($attributes['is_group'] ?? false);

        if ($parentId !== null) {
            $this->assertValidParent($game->scenes()->findOrFail($parentId));
        }

        return $game->scenes()->create([
            'title' => $attributes['title'],
            'parent_id' => $parentId,
            'is_group' => $isGroup,
            'type' => $isGroup ? null : ($attributes['type'] ?? 'dialogue'),
            'data' => $isGroup ? null : $this->prepareData($attributes['type'] ?? 'dialogue', $attributes['data'] ?? []),
            'background' => $attributes['background'] ?? null,
            'audio' => $attributes['audio'] ?? null,
            'effects' => $attributes['effects'] ?? null,
            'auto_advance' => $attributes['auto_advance'] ?? false,
            'auto_advance_delay_ms' => $attributes['auto_advance_delay_ms'] ?? null,
            'position' => $this->nextPosition($game, $parentId),
        ]);
    }

    public function update(Scene $scene, array $attributes): Scene
    {
        if (array_key_exists('parent_id', $attributes) && $attributes['parent_id'] !== $scene->parent_id) {
            $this->move($scene, $attributes['parent_id']);
        }

        foreach (['background', 'audio', 'effects', 'auto_advance', 'auto_advance_delay_ms'] as $field) {
            if (array_key_exists($field, $attributes)) {
                $scene->{$field} = $attributes[$field];
            }
        }

        if (! $scene->is_group && array_key_exists('data', $attributes)) {
            $scene->data = $this->prepareData($scene->type, $attributes['data']);
        }

        $scene->title = $attributes['title'] ?? $scene->title;
        $scene->save();

        return $scene;
    }

    public function move(Scene $scene, ?int $parentId): void
    {
        if ($parentId !== null) {
            $parent = Scene::findOrFail($parentId);

            if ($parent->game_id !== $scene->game_id) {
                throw ValidationException::withMessages(['parent_id' => 'Cannot move a scene into another game.']);
            }

            if ($parent->id === $scene->id || $parent->isDescendantOf($scene)) {
                throw ValidationException::withMessages(['parent_id' => 'Cannot move a scene inside itself.']);
            }

            $this->assertValidParent($parent);
        }

        $scene->update([
            'parent_id' => $parentId,
            'position' => $this->nextPosition($scene->game, $parentId),
        ]);
    }

    public function duplicate(Scene $scene): Scene
    {
        return DB::transaction(fn () => $this->copyScene($scene, $scene->parent_id, first: true));
    }

    public function delete(Scene $scene): void
    {
        $scene->delete();
    }

    /** @param list<int> $orderedIds */
    public function reorder(Game $game, array $orderedIds): void
    {
        DB::transaction(function () use ($game, $orderedIds) {
            foreach (array_values($orderedIds) as $position => $id) {
                $game->scenes()->whereKey($id)->update(['position' => $position]);
            }
        });
    }

    private function assertValidParent(Scene $parent): void
    {
        if (! $parent->is_group) {
            throw ValidationException::withMessages(['parent_id' => 'Scenes can only be placed inside a group.']);
        }
    }

    private function prepareData(string $type, array $data): array
    {
        if ($type === 'choice') {
            $data['options'] = array_values(array_map(function (array $option) {
                $option['id'] = $option['id'] ?? (string) Str::uuid();

                return $option;
            }, $data['options'] ?? []));
        }

        return $data;
    }

    private function copyScene(Scene $scene, ?int $parentId, bool $first = false): Scene
    {
        $copy = $scene->game->scenes()->create([
            ...$scene->only([
                'title', 'is_group', 'type', 'data', 'background', 'audio', 'effects',
                'auto_advance', 'auto_advance_delay_ms',
            ]),
            'title' => $first ? "{$scene->title} copy" : $scene->title,
            'parent_id' => $parentId,
            'position' => $this->nextPosition($scene->game, $parentId),
        ]);

        foreach ($scene->children as $child) {
            $this->copyScene($child, $copy->id);
        }

        return $copy;
    }

    private function nextPosition(Game $game, ?int $parentId): int
    {
        return ($game->scenes()->where('parent_id', $parentId)->max('position') ?? -1) + 1;
    }
}
