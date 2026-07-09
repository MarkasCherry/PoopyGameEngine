<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GameEditorApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('games');
    }

    private function createGame(): int
    {
        return $this->postJson('/api/games', ['title' => 'Test Tale'])->assertCreated()->json('id');
    }

    public function test_creating_a_game_scaffolds_its_folder_structure(): void
    {
        $this->createGame();

        foreach (['assets/backgrounds', 'assets/audio/music', 'assets/audio/sfx', 'assets/video', 'characters'] as $folder) {
            $this->assertTrue(Storage::disk('games')->directoryExists("test-tale/{$folder}"));
        }
    }

    public function test_deleting_a_game_removes_its_folder(): void
    {
        $id = $this->createGame();

        $this->deleteJson("/api/games/{$id}")->assertNoContent();

        $this->assertFalse(Storage::disk('games')->directoryExists('test-tale'));
        $this->assertDatabaseCount('games', 0);
    }

    public function test_character_creation_includes_a_default_global_appearance(): void
    {
        $gameId = $this->createGame();

        $this->postJson("/api/games/{$gameId}/characters", ['name' => 'Aria', 'text_color' => '#e879f9'])
            ->assertCreated()
            ->assertJsonPath('appearances.0.name', 'Default')
            ->assertJsonPath('appearances.0.scope', 'global')
            ->assertJsonPath('appearances.0.is_default', true);
    }

    public function test_appearance_image_is_stored_under_the_character_folder(): void
    {
        $gameId = $this->createGame();
        $characterId = $this->postJson("/api/games/{$gameId}/characters", ['name' => 'Aria'])->json('id');

        $response = $this->post("/api/characters/{$characterId}/appearances", [
            'name' => 'Happy',
            'image' => UploadedFile::fake()->image('happy.png'),
        ])->assertCreated();

        $this->assertSame('characters/aria/happy.png', $response->json('image_path'));
        Storage::disk('games')->assertExists('test-tale/characters/aria/happy.png');
    }

    public function test_scenes_default_to_dialogue_and_validate_data_per_type(): void
    {
        $gameId = $this->createGame();

        $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Line 1'])
            ->assertCreated()
            ->assertJsonPath('type', 'dialogue')
            ->assertJsonPath('is_group', false);

        $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Bad', 'type' => 'dialogue', 'data' => ['character_id' => 999],
        ])->assertUnprocessable()->assertJsonValidationErrors(['data.text', 'data.character_id']);

        $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Bad', 'type' => 'choice', 'data' => ['options' => []],
        ])->assertUnprocessable()->assertJsonValidationErrors(['data.options']);

        $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Bad', 'type' => 'teleport'])
            ->assertUnprocessable()->assertJsonValidationErrors(['type']);
    }

    public function test_scene_content_updates_and_choice_options_get_stable_ids(): void
    {
        $gameId = $this->createGame();
        $sceneId = $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Fork', 'type' => 'choice', 'data' => ['options' => [['text' => 'Go']]],
        ])->json('id');

        $response = $this->putJson("/api/scenes/{$sceneId}", [
            'data' => ['prompt' => 'Where to?', 'options' => [['text' => 'Left'], ['text' => 'Right']]],
            'effects' => [['type' => 'screen_flash', 'options' => ['color' => '#fff', 'duration_ms' => 100]]],
            'auto_advance' => false,
        ])->assertOk();

        $this->assertNotNull($response->json('data.options.0.id'));
        $this->assertSame('screen_flash', $response->json('effects.0.type'));
    }

    public function test_scenes_nest_only_inside_groups_and_never_inside_their_own_subtree(): void
    {
        $gameId = $this->createGame();
        $chapter = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Chapter 1', 'is_group' => true])->json('id');
        $episode = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Episode 1', 'is_group' => true, 'parent_id' => $chapter])->json('id');
        $line = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Line', 'parent_id' => $episode])
            ->assertCreated()->assertJsonPath('parent_id', $episode)->json('id');

        $this->putJson("/api/scenes/{$chapter}", ['parent_id' => $episode])
            ->assertUnprocessable()->assertJsonValidationErrors(['parent_id']);

        $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Bad', 'parent_id' => $line])
            ->assertUnprocessable()->assertJsonValidationErrors(['parent_id']);
    }

    public function test_group_background_cascades_and_carries_over_between_scenes(): void
    {
        $gameId = $this->createGame();
        $chapter = $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Chapter 1', 'is_group' => true,
            'background' => ['asset_path' => 'assets/backgrounds/forest.png', 'transition' => 'fade'],
        ])->json('id');

        $first = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Line 1', 'parent_id' => $chapter])->json('id');
        $cave = $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Line 2', 'parent_id' => $chapter,
            'background' => ['asset_path' => 'assets/backgrounds/cave.png', 'transition' => 'cut'],
        ])->json('id');
        $carry = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Line 3', 'parent_id' => $chapter])->json('id');

        $export = $this->getJson("/api/games/{$gameId}/export")->assertOk()->json();
        $scenes = collect($export['scenes'])->keyBy('id');

        $this->assertSame('2.1', $export['schema_version']);
        $this->assertSame($first, $export['start_scene_id']);
        $this->assertSame('assets/backgrounds/forest.png', $scenes[$first]['resolved_background']);
        $this->assertSame('assets/backgrounds/cave.png', $scenes[$cave]['resolved_background']);
        $this->assertSame('assets/backgrounds/cave.png', $scenes[$carry]['resolved_background']);
    }

    public function test_group_music_cascades_by_scope_and_resumes_after_an_override(): void
    {
        $gameId = $this->createGame();
        $chapter = $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Chapter 1', 'is_group' => true,
            'audio' => ['action' => 'play', 'asset_path' => 'assets/audio/music/theme.mp3', 'volume' => 0.8],
        ])->json('id');

        $intro = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Chapter 1 1', 'parent_id' => $chapter])->json('id');
        $battle = $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Chapter 1 2', 'parent_id' => $chapter,
            'audio' => ['action' => 'play', 'asset_path' => 'assets/audio/music/battle.mp3'],
        ])->json('id');
        $after = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Chapter 1 3', 'parent_id' => $chapter])->json('id');
        $silent = $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Chapter 1 4', 'parent_id' => $chapter,
            'audio' => ['action' => 'stop'],
        ])->json('id');
        $outside = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Epilogue'])->json('id');

        $export = $this->getJson("/api/games/{$gameId}/export")->assertOk()->json();
        $scenes = collect($export['scenes'])->keyBy('id');

        $this->assertSame('assets/audio/music/theme.mp3', $scenes[$intro]['resolved_music']['asset_path']);
        $this->assertEquals(0.8, $scenes[$intro]['resolved_music']['volume']);
        $this->assertSame('assets/audio/music/battle.mp3', $scenes[$battle]['resolved_music']['asset_path']);
        $this->assertSame('assets/audio/music/theme.mp3', $scenes[$after]['resolved_music']['asset_path']);
        $this->assertNull($scenes[$silent]['resolved_music']);
        $this->assertNull($scenes[$outside]['resolved_music']);
    }

    public function test_export_resolves_the_appearance_cascade_and_keeps_scene_references(): void
    {
        $gameId = $this->createGame();

        $character = $this->postJson("/api/games/{$gameId}/characters", ['name' => 'Aria', 'text_color' => '#e879f9'])->json();
        $appearanceId = $this->postJson("/api/characters/{$character['id']}/appearances", [
            'name' => 'Happy', 'text_color' => '#22d3ee',
        ])->json('id');

        $sceneId = $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Line', 'type' => 'dialogue',
            'data' => [
                'text' => 'Hi!', 'character_id' => $character['id'], 'appearance_id' => $appearanceId,
                'sprites' => [['character_id' => $character['id'], 'x' => 0.25, 'scale' => 0.9, 'flip' => true]],
            ],
        ])->json('id');

        $export = $this->getJson("/api/games/{$gameId}/export")->assertOk()->json();

        $happy = collect($export['characters'][0]['appearances'])->firstWhere('id', $appearanceId);
        $this->assertSame('#22d3ee', $happy['resolved']['text_color']);
        $this->assertSame('Aria', $happy['resolved']['display_name']);

        $scene = collect($export['scenes'])->firstWhere('id', $sceneId);
        $this->assertSame($appearanceId, $scene['data']['appearance_id']);
        $this->assertEquals(
            ['character_id' => $character['id'], 'appearance_id' => null, 'x' => 0.25, 'y' => 0, 'scale' => 0.9, 'flip' => true],
            $scene['data']['sprites'][0],
        );
    }

    public function test_duplicating_a_group_deep_copies_content(): void
    {
        $gameId = $this->createGame();
        $chapter = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Chapter 1', 'is_group' => true])->json('id');
        $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Line', 'parent_id' => $chapter, 'data' => ['text' => 'hello'],
        ]);

        $copy = $this->postJson("/api/scenes/{$chapter}/duplicate")->assertCreated()->json();

        $this->assertSame('Chapter 1 copy', $copy['title']);
        $this->assertTrue($copy['is_group']);

        $scenes = $this->getJson("/api/games/{$gameId}/scenes")->json();
        $copiedChild = collect($scenes)->firstWhere('parent_id', $copy['id']);

        $this->assertSame('hello', $copiedChild['data']['text']);
    }

    public function test_map_returns_scenes_with_choice_edges(): void
    {
        $gameId = $this->createGame();
        $start = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'Start'])->json('id');
        $end = $this->postJson("/api/games/{$gameId}/scenes", ['title' => 'End'])->json('id');

        $fork = $this->postJson("/api/games/{$gameId}/scenes", [
            'title' => 'Fork', 'type' => 'choice',
            'data' => ['options' => [['text' => 'Go', 'target_scene_id' => $end]]],
        ])->json('id');

        $map = $this->getJson("/api/games/{$gameId}/map")->assertOk()->json();

        $this->assertCount(3, $map['scenes']);
        $this->assertSame([['from' => $fork, 'to' => $end, 'label' => 'Go']], $map['edges']);
    }

    public function test_export_writes_game_json_into_the_game_folder(): void
    {
        $gameId = $this->createGame();

        $this->postJson("/api/games/{$gameId}/export")->assertCreated();

        Storage::disk('games')->assertExists('test-tale/game.json');
    }

    public function test_asset_file_endpoint_rejects_path_traversal(): void
    {
        $gameId = $this->createGame();

        $this->get("/api/games/{$gameId}/files/..%2f..%2f.env")->assertNotFound();
    }
}
