<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetRequest;
use App\Models\Game;
use App\Services\AssetService;
use App\Services\GameStorage;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AssetController extends Controller
{
    public function __construct(
        private AssetService $assets,
        private GameStorage $storage,
    ) {}

    public function index(Request $request, Game $game)
    {
        $assets = $this->assets->list($game, $request->query('category'));

        return response()->json(array_map(fn (array $asset) => [
            ...$asset,
            'url' => url("api/games/{$game->id}/files/{$asset['path']}"),
        ], $assets));
    }

    public function store(StoreAssetRequest $request, Game $game)
    {
        $path = $this->assets->store($game, $request->file('file'), $request->validated('category'));

        return response()->json([
            'path' => $path,
            'name' => basename($path),
            'category' => $request->validated('category'),
            'url' => url("api/games/{$game->id}/files/{$path}"),
        ], 201);
    }

    public function destroy(Request $request, Game $game)
    {
        $request->validate(['path' => ['required', 'string']]);

        $this->assets->delete($game, $request->input('path'));

        return response()->noContent();
    }

    public function file(Game $game, string $path)
    {
        try {
            $absolute = $this->storage->absolutePath($game, $path);
        } catch (InvalidArgumentException) {
            abort(404);
        }

        abort_unless(is_file($absolute), 404);

        return response()->file($absolute);
    }
}
