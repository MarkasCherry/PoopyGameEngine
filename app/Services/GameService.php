<?php

namespace App\Services;

use App\Models\Game;
use Illuminate\Support\Str;

class GameService
{
    public function __construct(private GameStorage $storage) {}

    public function create(array $attributes): Game
    {
        $game = Game::create([
            'title' => $attributes['title'],
            'slug' => $this->uniqueSlug($attributes['title']),
            'description' => $attributes['description'] ?? null,
            'settings' => $attributes['settings'] ?? null,
        ]);

        $this->storage->createGameFolders($game);

        return $game;
    }

    public function update(Game $game, array $attributes): Game
    {
        $game->update([
            'title' => $attributes['title'] ?? $game->title,
            'description' => array_key_exists('description', $attributes) ? $attributes['description'] : $game->description,
            'settings' => array_key_exists('settings', $attributes) ? $attributes['settings'] : $game->settings,
        ]);

        return $game;
    }

    public function delete(Game $game): void
    {
        $this->storage->deleteGameFolder($game);
        $game->delete();
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'game';
        $slug = $base;
        $counter = 1;

        while (Game::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
