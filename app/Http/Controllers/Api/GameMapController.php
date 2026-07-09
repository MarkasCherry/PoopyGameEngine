<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Services\SceneGraphService;

class GameMapController extends Controller
{
    public function show(Game $game, SceneGraphService $graph)
    {
        return response()->json($graph->map($game));
    }
}
