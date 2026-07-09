<?php

namespace App\Nodes;

use App\Models\Game;

interface NodeType
{
    public function type(): string;

    /** Validation rules for a scene's `data` payload, scoped to the given game. */
    public function dataRules(Game $game): array;

    /** Type-specific portion of the engine-facing serialization. */
    public function serializeData(array $data): array;
}
