<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReorderRequest;
use App\Http\Requests\SceneRequest;
use App\Http\Resources\SceneResource;
use App\Models\Game;
use App\Models\Scene;
use App\Services\SceneService;

class SceneController extends Controller
{
    public function __construct(private SceneService $scenes) {}

    public function index(Game $game)
    {
        return SceneResource::collection($game->scenes()->orderBy('position')->get());
    }

    public function store(SceneRequest $request, Game $game)
    {
        return new SceneResource($this->scenes->create($game, $request->validated()));
    }

    public function show(Scene $scene)
    {
        return new SceneResource($scene);
    }

    public function update(SceneRequest $request, Scene $scene)
    {
        return new SceneResource($this->scenes->update($scene, $request->validated()));
    }

    public function duplicate(Scene $scene)
    {
        return new SceneResource($this->scenes->duplicate($scene));
    }

    public function destroy(Scene $scene)
    {
        $this->scenes->delete($scene);

        return response()->noContent();
    }

    public function reorder(ReorderRequest $request, Game $game)
    {
        $this->scenes->reorder($game, $request->orderedIds());

        return SceneResource::collection($game->scenes()->orderBy('position')->get());
    }
}
