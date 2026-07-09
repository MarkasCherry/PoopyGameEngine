<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReorderRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'ordered_ids' => ['required', 'array', 'min:1'],
            'ordered_ids.*' => ['integer'],
        ];
    }

    /** @return list<int> */
    public function orderedIds(): array
    {
        return array_map(intval(...), $this->validated('ordered_ids'));
    }
}
