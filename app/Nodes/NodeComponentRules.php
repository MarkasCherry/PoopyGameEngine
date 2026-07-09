<?php

namespace App\Nodes;

use Illuminate\Validation\Rule;

class NodeComponentRules
{
    public const EFFECT_TYPES = ['sfx', 'screen_flash', 'screen_shake'];

    public static function rules(): array
    {
        return [
            'background' => ['nullable', 'array'],
            'background.asset_path' => ['required_with:background', 'string', 'max:1024'],
            'background.transition' => ['nullable', Rule::in(['fade', 'cut', 'slide'])],

            'audio' => ['nullable', 'array'],
            'audio.asset_path' => ['nullable', 'string', 'max:1024'],
            'audio.action' => ['required_with:audio', Rule::in(['play', 'stop'])],
            'audio.loop' => ['nullable', 'boolean'],
            'audio.volume' => ['nullable', 'numeric', 'min:0', 'max:1'],

            'effects' => ['nullable', 'array'],
            'effects.*.type' => ['required', Rule::in(self::EFFECT_TYPES)],
            'effects.*.asset_path' => ['nullable', 'string', 'max:1024'],
            'effects.*.options' => ['nullable', 'array'],

            'auto_advance' => ['nullable', 'boolean'],
            'auto_advance_delay_ms' => ['nullable', 'integer', 'min:0', 'max:600000'],
        ];
    }
}
