<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGameRequest;
use App\Http\Requests\UpdateGameRequest;
use App\Http\Resources\GameResource;
use App\Models\Game;
use App\Services\GameService;

class GameController extends Controller
{
    public function __construct(private GameService $games) {}

    public function index()
    {
        return GameResource::collection(
            Game::withCount(['scenes', 'characters'])->latest('updated_at')->get(),
        );
    }

    public function store(StoreGameRequest $request)
    {
        return new GameResource($this->games->create($request->validated()));
    }

    public function show(Game $game)
    {
        return new GameResource($game->loadCount(['scenes', 'characters']));
    }

    public function update(UpdateGameRequest $request, Game $game)
    {
        return new GameResource($this->games->update($game, $request->validated()));
    }

    public function destroy(Game $game)
    {
        $this->games->delete($game);

        return response()->noContent();
    }
}
