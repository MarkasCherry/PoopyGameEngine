<?php

namespace App\Services;

use App\Models\Appearance;
use App\Models\Character;
use App\Models\Game;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use InvalidArgumentException;

class AssetService
{
    public const CATEGORIES = [
        'background' => 'assets/backgrounds',
        'music' => 'assets/audio/music',
        'sfx' => 'assets/audio/sfx',
        'video' => 'assets/video',
    ];

    public function __construct(private GameStorage $storage) {}

    public function store(Game $game, UploadedFile $file, string $category): string
    {
        $folder = self::CATEGORIES[$category]
            ?? throw new InvalidArgumentException("Unknown asset category [{$category}].");

        $relativePath = $folder.'/'.$this->uniqueFilename($game, $folder, $file);

        $this->putFile($game, $relativePath, $file);

        return $relativePath;
    }

    public function storeAppearanceImage(Character $character, Appearance $appearance, UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
        $relativePath = "characters/{$character->slug}/{$appearance->slug}.{$extension}";

        $this->putFile($character->game, $relativePath, $file);

        return $relativePath;
    }

    /** @return list<array{path: string, name: string, category: string, size: int}> */
    public function list(Game $game, ?string $category = null): array
    {
        $categories = $category !== null
            ? [$category => self::CATEGORIES[$category] ?? throw new InvalidArgumentException("Unknown asset category [{$category}].")]
            : self::CATEGORIES;

        $disk = $this->storage->disk();
        $assets = [];

        foreach ($categories as $name => $folder) {
            foreach ($disk->files("{$game->slug}/{$folder}") as $file) {
                $relative = Str::after($file, "{$game->slug}/");

                $assets[] = [
                    'path' => $relative,
                    'name' => basename($relative),
                    'category' => $name,
                    'size' => $disk->size($file),
                ];
            }
        }

        return $assets;
    }

    public function delete(Game $game, string $relativePath): void
    {
        $this->storage->delete($game, $relativePath);
    }

    private function putFile(Game $game, string $relativePath, UploadedFile $file): void
    {
        $target = $this->storage->resolve($game, $relativePath);

        $this->storage->disk()->putFileAs(
            dirname($target),
            $file,
            basename($target),
        );
    }

    private function uniqueFilename(Game $game, string $folder, UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: 'bin');
        $base = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'asset';
        $disk = $this->storage->disk();

        $candidate = "{$base}.{$extension}";
        $counter = 1;

        while ($disk->exists("{$game->slug}/{$folder}/{$candidate}")) {
            $candidate = "{$base}-{$counter}.{$extension}";
            $counter++;
        }

        return $candidate;
    }
}
