<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCharacterRequest;
use App\Http\Requests\UpdateCharacterRequest;
use App\Http\Resources\CharacterResource;
use App\Models\Character;
use App\Models\Game;
use App\Services\CharacterService;

class CharacterController extends Controller
{
    public function __construct(private CharacterService $characters) {}

    public function index(Game $game)
    {
        return CharacterResource::collection($game->characters()->with('appearances')->get());
    }

    public function store(StoreCharacterRequest $request, Game $game)
    {
        $character = $this->characters->create($game, $request->validated(), $request->file('image'));

        return new CharacterResource($character->load('appearances'));
    }

    public function show(Character $character)
    {
        return new CharacterResource($character->load('appearances'));
    }

    public function update(UpdateCharacterRequest $request, Character $character)
    {
        return new CharacterResource(
            $this->characters->update($character, $request->validated())->load('appearances'),
        );
    }

    public function destroy(Character $character)
    {
        $this->characters->delete($character);

        return response()->noContent();
    }
}
