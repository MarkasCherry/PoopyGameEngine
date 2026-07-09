<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppearanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $gameId = $this->character->game_id;

        return [
            'id' => $this->id,
            'character_id' => $this->character_id,
            'scene_id' => $this->scene_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'scope' => $this->scope,
            'is_default' => $this->is_default,
            'image_path' => $this->image_path,
            'image_url' => $this->image_path !== null
                ? url("api/games/{$gameId}/files/{$this->image_path}")."?v={$this->updated_at?->timestamp}"
                : null,
            'display_name' => $this->display_name,
            'text_color' => $this->text_color,
            'meta' => $this->meta,
        ];
    }
}
