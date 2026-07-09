<?php

namespace App\Services;

use App\Models\Appearance;
use App\Models\Character;
use App\Models\Game;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class CharacterService
{
    public function __construct(
        private GameStorage $storage,
        private AppearanceService $appearances,
    ) {}

    public function create(Game $game, array $attributes, ?UploadedFile $defaultImage = null): Character
    {
        $character = $game->characters()->create([
            'name' => $attributes['name'],
            'slug' => $this->uniqueSlug($game, $attributes['name']),
            'type' => $attributes['type'] ?? null,
            'display_name' => $attributes['display_name'] ?? null,
            'text_color' => $attributes['text_color'] ?? null,
            'meta' => $attributes['meta'] ?? null,
        ]);

        $this->appearances->create($character, [
            'name' => 'Default',
            'scope' => Appearance::SCOPE_GLOBAL,
            'is_default' => true,
        ], $defaultImage);

        return $character;
    }

    public function update(Character $character, array $attributes): Character
    {
        $character->update([
            'name' => $attributes['name'] ?? $character->name,
            'type' => array_key_exists('type', $attributes) ? $attributes['type'] : $character->type,
            'display_name' => array_key_exists('display_name', $attributes) ? $attributes['display_name'] : $character->display_name,
            'text_color' => array_key_exists('text_color', $attributes) ? $attributes['text_color'] : $character->text_color,
            'meta' => array_key_exists('meta', $attributes) ? $attributes['meta'] : $character->meta,
        ]);

        return $character;
    }

    public function delete(Character $character): void
    {
        $this->storage->disk()->deleteDirectory("{$character->game->slug}/characters/{$character->slug}");
        $character->delete();
    }

    private function uniqueSlug(Game $game, string $name): string
    {
        $base = Str::slug($name) ?: 'character';
        $slug = $base;
        $counter = 1;

        while ($game->characters()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
