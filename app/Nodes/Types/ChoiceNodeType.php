<?php

namespace App\Nodes\Types;

use App\Models\Game;
use App\Nodes\NodeType;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ChoiceNodeType implements NodeType
{
    public function type(): string
    {
        return 'choice';
    }

    public function dataRules(Game $game): array
    {
        return [
            'data.prompt' => ['nullable', 'string'],
            'data.options' => ['required', 'array', 'min:1'],
            'data.options.*.id' => ['nullable', 'string', 'max:64'],
            'data.options.*.text' => ['present', 'nullable', 'string'],
            'data.options.*.target_scene_id' => [
                'nullable', 'integer',
                Rule::exists('scenes', 'id')->where('game_id', $game->id),
            ],
        ];
    }

    public function serializeData(array $data): array
    {
        return [
            'prompt' => $data['prompt'] ?? null,
            'options' => array_values(array_map(fn (array $option) => [
                'id' => $option['id'] ?? (string) Str::uuid(),
                'text' => $option['text'] ?? '',
                'target_scene_id' => $option['target_scene_id'] ?? null,
            ], $data['options'] ?? [])),
        ];
    }
}
