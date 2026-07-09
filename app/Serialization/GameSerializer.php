<?php

namespace App\Serialization;

use App\Models\Appearance;
use App\Models\Character;
use App\Models\Game;
use App\Models\Scene;
use App\Nodes\NodeTypeRegistry;
use App\Services\GameStorage;
use App\Services\SceneBackgroundResolver;
use App\Services\SceneMusicResolver;

class GameSerializer
{
    public const SCHEMA_VERSION = '2.1';

    public function __construct(
        private NodeTypeRegistry $registry,
        private AppearanceResolver $resolver,
        private SceneBackgroundResolver $backgrounds,
        private SceneMusicResolver $music,
        private GameStorage $storage,
    ) {}

    public function serialize(Game $game): array
    {
        $game->load(['scenes', 'characters.appearances']);

        $scenes = $this->flattenDepthFirst($game->scenes);
        $backgrounds = $this->backgrounds->resolve($game->scenes);
        $music = $this->music->resolve($game->scenes);

        return [
            'schema_version' => self::SCHEMA_VERSION,
            'game' => [
                'id' => $game->id,
                'title' => $game->title,
                'slug' => $game->slug,
                'description' => $game->description,
                'settings' => $game->settings ?? (object) [],
            ],
            'start_scene_id' => $scenes->first(fn (Scene $scene) => $scene->isPlayable())?->id,
            'characters' => $game->characters
                ->map(fn (Character $character) => $this->serializeCharacter($character))
                ->values()
                ->all(),
            'scenes' => $scenes
                ->map(fn (Scene $scene) => $this->serializeScene($scene, $backgrounds, $music))
                ->values()
                ->all(),
        ];
    }

    public function export(Game $game): string
    {
        $json = json_encode(
            $this->serialize($game),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        );

        $path = "{$game->slug}/game.json";
        $this->storage->disk()->put($path, $json);

        return $path;
    }

    private function flattenDepthFirst($scenes, ?int $parentId = null)
    {
        return $scenes
            ->where('parent_id', $parentId)
            ->sortBy('position')
            ->flatMap(fn (Scene $scene) => collect([$scene])->concat($this->flattenDepthFirst($scenes, $scene->id)))
            ->values();
    }

    private function serializeScene(Scene $scene, array $backgrounds, array $music): array
    {
        return [
            'id' => $scene->id,
            'title' => $scene->title,
            'parent_id' => $scene->parent_id,
            'is_group' => $scene->is_group,
            'type' => $scene->type,
            'position' => $scene->position,
            'background' => $scene->background,
            'resolved_background' => $backgrounds[$scene->id] ?? null,
            'resolved_music' => $music[$scene->id] ?? null,
            'components' => [
                'audio' => $scene->audio,
                'effects' => $scene->effects ?? [],
            ],
            'auto_advance' => $scene->auto_advance,
            'auto_advance_delay_ms' => $scene->auto_advance_delay_ms,
            'data' => $scene->isPlayable()
                ? $this->registry->get($scene->type)->serializeData($scene->data ?? [])
                : null,
        ];
    }

    private function serializeCharacter(Character $character): array
    {
        return [
            'id' => $character->id,
            'name' => $character->name,
            'type' => $character->type,
            'display_name' => $character->display_name ?? $character->name,
            'text_color' => $character->text_color,
            'default_appearance_id' => $character->appearances->firstWhere('is_default', true)?->id,
            'appearances' => $character->appearances
                ->map(fn (Appearance $appearance) => $this->serializeAppearance($character, $appearance))
                ->values()
                ->all(),
        ];
    }

    private function serializeAppearance(Character $character, Appearance $appearance): array
    {
        return [
            'id' => $appearance->id,
            'name' => $appearance->name,
            'scope' => $appearance->scope,
            'scene_id' => $appearance->scene_id,
            'resolved' => $this->resolver->resolve($character, $appearance),
            'overrides' => [
                'display_name' => $appearance->display_name,
                'text_color' => $appearance->text_color,
                'image' => $appearance->image_path,
            ],
        ];
    }
}
