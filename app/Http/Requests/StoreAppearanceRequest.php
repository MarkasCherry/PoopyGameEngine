<?php

namespace App\Http\Requests;

use App\Models\Appearance;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAppearanceRequest extends FormRequest
{
    public function rules(): array
    {
        $character = $this->route('character');

        return [
            'name' => ['required', 'string', 'max:255'],
            'scope' => ['nullable', Rule::in([Appearance::SCOPE_GLOBAL, Appearance::SCOPE_SCENE])],
            'scene_id' => [
                'nullable', 'required_if:scope,'.Appearance::SCOPE_SCENE, 'integer',
                Rule::exists('scenes', 'id')->where('game_id', $character->game_id),
            ],
            'display_name' => ['nullable', 'string', 'max:255'],
            'text_color' => ['nullable', 'string', 'max:32'],
            'meta' => ['nullable', 'array'],
            'image' => ['nullable', 'file', 'image', 'max:20480'],
        ];
    }
}
