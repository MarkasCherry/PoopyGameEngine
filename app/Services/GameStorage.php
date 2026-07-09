<?php

namespace App\Services;

use App\Models\Game;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class GameStorage
{
    public const FOLDERS = [
        'assets/backgrounds',
        'assets/audio/music',
        'assets/audio/sfx',
        'assets/video',
        'characters',
    ];

    public function disk(): Filesystem
    {
        return Storage::disk('games');
    }

    public function createGameFolders(Game $game): void
    {
        foreach (self::FOLDERS as $folder) {
            $this->disk()->makeDirectory("{$game->slug}/{$folder}");
        }
    }

    public function deleteGameFolder(Game $game): void
    {
        $this->disk()->deleteDirectory($game->slug);
    }

    /** Resolve a game-relative path, rejecting traversal outside the game folder. */
    public function resolve(Game $game, string $relativePath): string
    {
        $normalized = $this->normalize($relativePath);

        return "{$game->slug}/{$normalized}";
    }

    public function exists(Game $game, string $relativePath): bool
    {
        return $this->disk()->exists($this->resolve($game, $relativePath));
    }

    public function absolutePath(Game $game, string $relativePath): string
    {
        return $this->disk()->path($this->resolve($game, $relativePath));
    }

    public function delete(Game $game, string $relativePath): void
    {
        $this->disk()->delete($this->resolve($game, $relativePath));
    }

    private function normalize(string $path): string
    {
        $segments = [];

        foreach (explode('/', str_replace('\\', '/', $path)) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }

            if ($segment === '..') {
                throw new InvalidArgumentException('Path traversal is not allowed.');
            }

            $segments[] = $segment;
        }

        if ($segments === []) {
            throw new InvalidArgumentException('Empty asset path.');
        }

        return implode('/', $segments);
    }
}
