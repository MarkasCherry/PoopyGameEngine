<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SceneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'game_id' => $this->game_id,
            'parent_id' => $this->parent_id,
            'is_group' => $this->is_group,
            'type' => $this->type,
            'title' => $this->title,
            'position' => $this->position,
            'data' => $this->data,
            'background' => $this->background,
            'audio' => $this->audio,
            'effects' => $this->effects ?? [],
            'auto_advance' => $this->auto_advance,
            'auto_advance_delay_ms' => $this->auto_advance_delay_ms,
        ];
    }
}
