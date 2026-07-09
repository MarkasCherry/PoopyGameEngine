<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appearance extends Model
{
    public const SCOPE_GLOBAL = 'global';

    public const SCOPE_SCENE = 'scene';

    protected $fillable = [
        'name', 'slug', 'scope', 'scene_id', 'is_default',
        'image_path', 'display_name', 'text_color', 'meta',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'meta' => 'array',
        ];
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    public function scene(): BelongsTo
    {
        return $this->belongsTo(Scene::class);
    }
}
