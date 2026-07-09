<?php

namespace App\Nodes\Types;

use App\Models\Game;
use App\Nodes\NodeType;
use Illuminate\Validation\Rule;

class DialogueNodeType implements NodeType
{
    public function type(): string
    {
        return 'dialogue';
    }

    public function dataRules(Game $game): array
    {
        $characterExists = Rule::exists('characters', 'id')->where('game_id', $game->id);

        return [
            'data.text' => ['present', 'nullable', 'string'],
            'data.character_id' => ['nullable', 'integer', $characterExists],
            'data.appearance_id' => ['nullable', 'integer', 'exists:appearances,id'],
            'data.speaker_name' => ['nullable', 'string', 'max:255'],
            'data.speaker_color' => ['nullable', 'string', 'max:32'],
            'data.speaker_position' => ['nullable', Rule::in(['left', 'center', 'right'])],
            'data.sprites' => ['nullable', 'array'],
            'data.sprites.*.character_id' => ['required', 'integer', $characterExists],
            'data.sprites.*.appearance_id' => ['nullable', 'integer', 'exists:appearances,id'],
            'data.sprites.*.x' => ['nullable', 'numeric', 'min:-0.5', 'max:1.5'],
            'data.sprites.*.y' => ['nullable', 'numeric', 'min:-0.5', 'max:1'],
            'data.sprites.*.scale' => ['nullable', 'numeric', 'min:0.05', 'max:4'],
            'data.sprites.*.flip' => ['nullable', 'boolean'],
        ];
    }

    public function serializeData(array $data): array
    {
        return [
            'text' => $data['text'] ?? '',
            'character_id' => $data['character_id'] ?? null,
            'appearance_id' => $data['appearance_id'] ?? null,
            'speaker_name' => $data['speaker_name'] ?? null,
            'speaker_color' => $data['speaker_color'] ?? null,
            'speaker_position' => $data['speaker_position'] ?? 'center',
            'sprites' => array_values(array_map(fn (array $sprite) => [
                'character_id' => $sprite['character_id'],
                'appearance_id' => $sprite['appearance_id'] ?? null,
                'x' => (float) ($sprite['x'] ?? 0.5),
                'y' => (float) ($sprite['y'] ?? 0),
                'scale' => (float) ($sprite['scale'] ?? 0.85),
                'flip' => (bool) ($sprite['flip'] ?? false),
            ], $data['sprites'] ?? [])),
        ];
    }
}
