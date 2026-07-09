<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Serialization\GameSerializer;

class GameExportController extends Controller
{
    public function __construct(private GameSerializer $serializer) {}

    public function show(Game $game)
    {
        return response()->json($this->serializer->serialize($game));
    }

    public function store(Game $game)
    {
        $path = $this->serializer->export($game);

        return response()->json([
            'path' => $path,
            'schema_version' => GameSerializer::SCHEMA_VERSION,
        ], 201);
    }
}
