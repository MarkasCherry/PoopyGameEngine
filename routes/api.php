<?php

use App\Http\Controllers\Api\AppearanceController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\CharacterController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\GameExportController;
use App\Http\Controllers\Api\GameMapController;
use App\Http\Controllers\Api\NodeTypeController;
use App\Http\Controllers\Api\SceneController;
use Illuminate\Support\Facades\Route;

Route::get('node-types', [NodeTypeController::class, 'index']);

Route::apiResource('games', GameController::class);

Route::prefix('games/{game}')->group(function () {
    Route::get('export', [GameExportController::class, 'show']);
    Route::post('export', [GameExportController::class, 'store']);
    Route::get('map', [GameMapController::class, 'show']);

    Route::get('assets', [AssetController::class, 'index']);
    Route::post('assets', [AssetController::class, 'store']);
    Route::delete('assets', [AssetController::class, 'destroy']);
    Route::get('files/{path}', [AssetController::class, 'file'])->where('path', '.*');

    Route::put('scenes/reorder', [SceneController::class, 'reorder'])->scopeBindings();
});

Route::apiResource('games.scenes', SceneController::class)->shallow()->scoped();
Route::post('scenes/{scene}/duplicate', [SceneController::class, 'duplicate']);
Route::apiResource('characters.appearances', AppearanceController::class)
    ->shallow()->scoped()->only(['store', 'update', 'destroy']);
Route::apiResource('games.characters', CharacterController::class)->shallow()->scoped();
