<?php

namespace App\Nodes\Types;

use App\Models\Game;
use App\Nodes\NodeType;

class VideoNodeType implements NodeType
{
    public function type(): string
    {
        return 'video';
    }

    public function dataRules(Game $game): array
    {
        return [
            'data.asset_path' => ['nullable', 'string', 'max:1024'],
            'data.loop' => ['nullable', 'boolean'],
            'data.skippable' => ['nullable', 'boolean'],
        ];
    }

    public function serializeData(array $data): array
    {
        return [
            'asset_path' => $data['asset_path'] ?? null,
            'loop' => (bool) ($data['loop'] ?? false),
            'skippable' => (bool) ($data['skippable'] ?? true),
        ];
    }
}
