<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppearanceRequest;
use App\Http\Requests\UpdateAppearanceRequest;
use App\Http\Resources\AppearanceResource;
use App\Models\Appearance;
use App\Models\Character;
use App\Services\AppearanceService;

class AppearanceController extends Controller
{
    public function __construct(private AppearanceService $appearances) {}

    public function store(StoreAppearanceRequest $request, Character $character)
    {
        return new AppearanceResource(
            $this->appearances->create($character, $request->validated(), $request->file('image')),
        );
    }

    public function update(UpdateAppearanceRequest $request, Appearance $appearance)
    {
        return new AppearanceResource(
            $this->appearances->update($appearance, $request->validated(), $request->file('image')),
        );
    }

    public function destroy(Appearance $appearance)
    {
        $this->appearances->delete($appearance);

        return response()->noContent();
    }
}
