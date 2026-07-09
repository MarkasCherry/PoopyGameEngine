<?php

namespace App\Http\Requests;

use App\Services\AssetService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetRequest extends FormRequest
{
    public function rules(): array
    {
        $mimesByCategory = [
            'background' => 'mimes:jpg,jpeg,png,webp,gif',
            'music' => 'mimes:mp3,ogg,wav,m4a,flac',
            'sfx' => 'mimes:mp3,ogg,wav,m4a,flac',
            'video' => 'mimes:mp4,webm,mov',
        ];

        $category = $this->input('category');

        return [
            'category' => ['required', Rule::in(array_keys(AssetService::CATEGORIES))],
            'file' => [
                'required', 'file', 'max:204800',
                ...(isset($mimesByCategory[$category]) ? [$mimesByCategory[$category]] : []),
            ],
        ];
    }
}
