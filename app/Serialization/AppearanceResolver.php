<?php

namespace App\Serialization;

use App\Models\Appearance;
use App\Models\Character;

class AppearanceResolver
{
    /**
     * Merge character defaults with appearance overrides.
     * Character defaults apply wherever the appearance does not override.
     */
    public function resolve(Character $character, Appearance $appearance): array
    {
        return [
            'display_name' => $appearance->display_name
                ?? $character->display_name
                ?? $character->name,
            'text_color' => $appearance->text_color ?? $character->text_color,
            'image' => $appearance->image_path,
        ];
    }
}
