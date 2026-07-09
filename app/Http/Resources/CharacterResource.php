<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CharacterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'game_id' => $this->game_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type,
            'display_name' => $this->display_name,
            'text_color' => $this->text_color,
            'meta' => $this->meta,
            'appearances' => AppearanceResource::collection($this->whenLoaded('appearances')),
        ];
    }
}
