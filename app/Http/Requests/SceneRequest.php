<?php

namespace App\Http\Requests;

use App\Nodes\NodeComponentRules;
use App\Nodes\NodeTypeRegistry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SceneRequest extends FormRequest
{
    public function rules(): array
    {
        $registry = app(NodeTypeRegistry::class);
        $scene = $this->route('scene');
        $game = $this->route('game') ?? $scene->game;

        $rules = [
            'title' => [$this->isMethod('POST') ? 'required' : 'sometimes', 'string', 'max:255'],
            'is_group' => ['nullable', 'boolean'],
            'type' => ['nullable', Rule::in($registry->typeNames())],
            'parent_id' => [
                'nullable', 'integer',
                Rule::exists('scenes', 'id')->where('game_id', $game->id),
            ],
            ...NodeComponentRules::rules(),
        ];

        $type = $scene?->type ?? $this->input('type') ?? 'dialogue';

        if ($this->has('data') && $registry->has($type)) {
            $rules['data'] = ['required', 'array'];
            $rules = [...$rules, ...$registry->get($type)->dataRules($game)];
        }

        return $rules;
    }
}
