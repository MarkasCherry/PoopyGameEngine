<?php

namespace App\Http\Requests;

use App\Models\Appearance;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppearanceRequest extends FormRequest
{
    public function rules(): array
    {
        $appearance = $this->route('appearance');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'scope' => ['nullable', Rule::in([Appearance::SCOPE_GLOBAL, Appearance::SCOPE_SCENE])],
            'scene_id' => [
                'nullable', 'integer',
                Rule::exists('scenes', 'id')->where('game_id', $appearance->character->game_id),
            ],
            'display_name' => ['nullable', 'string', 'max:255'],
            'text_color' => ['nullable', 'string', 'max:32'],
            'meta' => ['nullable', 'array'],
            'image' => ['nullable', 'file', 'image', 'max:20480'],
        ];
    }
}
