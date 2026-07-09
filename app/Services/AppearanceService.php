<?php

namespace App\Services;

use App\Models\Appearance;
use App\Models\Character;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class AppearanceService
{
    public function __construct(
        private AssetService $assets,
        private GameStorage $storage,
    ) {}

    public function create(Character $character, array $attributes, ?UploadedFile $image = null): Appearance
    {
        $appearance = $character->appearances()->create([
            'name' => $attributes['name'],
            'slug' => $this->uniqueSlug($character, $attributes['name']),
            'scope' => $attributes['scope'] ?? Appearance::SCOPE_GLOBAL,
            'scene_id' => ($attributes['scope'] ?? null) === Appearance::SCOPE_SCENE ? ($attributes['scene_id'] ?? null) : null,
            'is_default' => $attributes['is_default'] ?? false,
            'display_name' => $attributes['display_name'] ?? null,
            'text_color' => $attributes['text_color'] ?? null,
            'meta' => $attributes['meta'] ?? null,
        ]);

        if ($image !== null) {
            $appearance->update([
                'image_path' => $this->assets->storeAppearanceImage($character, $appearance, $image),
            ]);
        }

        return $appearance;
    }

    public function update(Appearance $appearance, array $attributes, ?UploadedFile $image = null): Appearance
    {
        $scope = $attributes['scope'] ?? $appearance->scope;

        $appearance->update([
            'name' => $attributes['name'] ?? $appearance->name,
            'scope' => $scope,
            'scene_id' => $scope === Appearance::SCOPE_SCENE
                ? ($attributes['scene_id'] ?? $appearance->scene_id)
                : null,
            'display_name' => array_key_exists('display_name', $attributes) ? $attributes['display_name'] : $appearance->display_name,
            'text_color' => array_key_exists('text_color', $attributes) ? $attributes['text_color'] : $appearance->text_color,
            'meta' => array_key_exists('meta', $attributes) ? $attributes['meta'] : $appearance->meta,
        ]);

        if ($image !== null) {
            $this->deleteImage($appearance);

            $appearance->update([
                'image_path' => $this->assets->storeAppearanceImage($appearance->character, $appearance, $image),
            ]);
        }

        return $appearance;
    }

    public function delete(Appearance $appearance): void
    {
        $this->deleteImage($appearance);
        $appearance->delete();
    }

    private function deleteImage(Appearance $appearance): void
    {
        if ($appearance->image_path !== null) {
            $this->storage->delete($appearance->character->game, $appearance->image_path);
        }
    }

    private function uniqueSlug(Character $character, string $name): string
    {
        $base = Str::slug($name) ?: 'appearance';
        $slug = $base;
        $counter = 1;

        while ($character->appearances()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
