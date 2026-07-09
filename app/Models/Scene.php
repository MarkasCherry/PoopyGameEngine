<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Scene extends Model
{
    protected $fillable = [
        'title', 'position', 'parent_id', 'is_group', 'type',
        'data', 'background', 'audio', 'effects',
        'auto_advance', 'auto_advance_delay_ms',
    ];

    protected function casts(): array
    {
        return [
            'is_group' => 'boolean',
            'data' => 'array',
            'background' => 'array',
            'audio' => 'array',
            'effects' => 'array',
            'auto_advance' => 'boolean',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('position');
    }

    public function appearances(): HasMany
    {
        return $this->hasMany(Appearance::class);
    }

    public function isPlayable(): bool
    {
        return ! $this->is_group && $this->type !== null;
    }

    public function isDescendantOf(Scene $other): bool
    {
        $current = $this;

        while ($current->parent_id !== null) {
            if ($current->parent_id === $other->id) {
                return true;
            }

            $current = $current->parent;
        }

        return false;
    }
}
