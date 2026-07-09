<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCharacterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
            'display_name' => ['nullable', 'string', 'max:255'],
            'text_color' => ['nullable', 'string', 'max:32'],
            'meta' => ['nullable', 'array'],
            'image' => ['nullable', 'file', 'image', 'max:20480'],
        ];
    }
}
