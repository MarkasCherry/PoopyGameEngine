<?php

namespace App\Console\Commands;

use App\Models\Game;
use App\Models\Scene;
use App\Services\AssetService;
use App\Services\CharacterService;
use App\Services\GameService;
use App\Services\SceneService;
use Illuminate\Console\Command;

class StressTestScenes extends Command
{
    protected $signature = 'game:stress {count? : How many scenes/groups to create} {--game= : Game id to fill (omit to pick interactively)}';

    protected $description = 'Fill a game with a random nested story (groups, dialogue, choices, videos) for stress testing';

    private const MAX_GROUP_DEPTH = 3;

    public function __construct(
        private GameService $games,
        private SceneService $scenes,
        private CharacterService $characters,
        private AssetService $assets,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $count = (int) ($this->argument('count') ?? $this->ask('How many scenes/groups should be created?', '50'));

        if ($count < 1) {
            $this->error('Count must be at least 1.');

            return self::FAILURE;
        }

        $game = $this->resolveGame();
        $characters = $this->ensureCharacters($game);

        $backgrounds = array_column($this->assets->list($game, 'background'), 'path');
        $music = array_column($this->assets->list($game, 'music'), 'path');
        $videos = array_column($this->assets->list($game, 'video'), 'path');

        // parent pool: id => depth; null key (root) is always available
        $groupDepths = [];
        $created = [];
        $choices = [];
        $stats = ['group' => 0, 'dialogue' => 0, 'choice' => 0, 'video' => 0];

        $this->withProgressBar(range(1, $count), function () use ($game, $characters, $backgrounds, $music, $videos, &$groupDepths, &$created, &$choices, &$stats) {
            $parentId = $this->pickParent($groupDepths);

            if ($this->chance(22) && ($parentId === null || $groupDepths[$parentId] < self::MAX_GROUP_DEPTH)) {
                $group = $this->scenes->create($game, [
                    'title' => ucfirst(fake()->words(2, true)),
                    'is_group' => true,
                    'parent_id' => $parentId,
                    'background' => $backgrounds && $this->chance(35)
                        ? ['asset_path' => fake()->randomElement($backgrounds), 'transition' => fake()->randomElement(['fade', 'cut', 'slide'])]
                        : null,
                    'audio' => $music && $this->chance(30)
                        ? ['action' => 'play', 'asset_path' => fake()->randomElement($music), 'loop' => true, 'volume' => fake()->randomFloat(2, 0.3, 1)]
                        : null,
                ]);
                $groupDepths[$group->id] = $parentId === null ? 1 : $groupDepths[$parentId] + 1;
                $created[] = $group;
                $stats['group']++;

                return;
            }

            $type = fake()->randomElement(['dialogue', 'dialogue', 'dialogue', 'dialogue', 'dialogue', 'dialogue', 'dialogue', 'choice', 'choice', 'video']);
            $scene = $this->scenes->create($game, [
                'title' => ucfirst(fake()->words(3, true)),
                'parent_id' => $parentId,
                'type' => $type,
                'data' => $this->randomData($type, $characters, $videos),
                'background' => $backgrounds && $this->chance(15)
                    ? ['asset_path' => fake()->randomElement($backgrounds), 'transition' => fake()->randomElement(['fade', 'cut', 'slide'])]
                    : null,
                'audio' => $music && $this->chance(8)
                    ? ['action' => 'play', 'asset_path' => fake()->randomElement($music), 'loop' => true, 'volume' => 1]
                    : null,
                'effects' => $this->chance(10)
                    ? [fake()->randomElement([
                        ['type' => 'screen_flash', 'options' => ['color' => fake()->hexColor(), 'duration_ms' => fake()->numberBetween(150, 500)]],
                        ['type' => 'screen_shake', 'options' => ['intensity' => fake()->randomFloat(1, 0.2, 1), 'duration_ms' => fake()->numberBetween(200, 700)]],
                    ])]
                    : null,
                'auto_advance' => $type === 'dialogue' && $this->chance(10),
                'auto_advance_delay_ms' => fake()->numberBetween(300, 1500),
            ]);
            $created[] = $scene;
            if ($type === 'choice') {
                $choices[] = $scene;
            }
            $stats[$type]++;
        });

        $this->connectChoices($choices, $created);

        $this->newLine(2);
        $this->info("Done — game \"{$game->title}\" (id {$game->id}) now has {$game->scenes()->count()} scenes total.");
        $this->table(
            ['Groups', 'Dialogue', 'Choices', 'Videos'],
            [[$stats['group'], $stats['dialogue'], $stats['choice'], $stats['video']]],
        );
        $this->line('Open the Story Map for the full flowchart, or hit Play to run it.');

        return self::SUCCESS;
    }

    private function resolveGame(): Game
    {
        if ($this->option('game')) {
            return Game::findOrFail((int) $this->option('game'));
        }

        $games = Game::orderBy('id')->get();
        $fresh = '✨ Create a fresh stress-test game';
        $picked = $this->choice(
            'Which game should be filled?',
            [...$games->map(fn (Game $g) => "#{$g->id} {$g->title}")->all(), $fresh],
            $fresh,
        );

        if ($picked === $fresh) {
            return $this->games->create([
                'title' => 'Stress Test '.now()->format('H:i:s'),
                'description' => 'Generated by game:stress — safe to delete.',
            ]);
        }

        return $games[array_search($picked, $games->map(fn (Game $g) => "#{$g->id} {$g->title}")->all(), true)];
    }

    /** @return list<int> character ids */
    private function ensureCharacters(Game $game): array
    {
        $existing = $game->characters()->pluck('id')->all();

        if (count($existing) >= 3) {
            return $existing;
        }

        for ($i = count($existing); $i < 3; $i++) {
            $existing[] = $this->characters->create($game, [
                'name' => fake()->firstName(),
                'text_color' => fake()->hexColor(),
            ])->id;
        }

        return $existing;
    }

    private function pickParent(array $groupDepths): ?int
    {
        // Root plus every group, so nesting grows organically as groups appear.
        $pool = [null, null, ...array_keys($groupDepths)];

        return fake()->randomElement($pool);
    }

    private function randomData(string $type, array $characters, array $videos): array
    {
        if ($type === 'dialogue') {
            $speaker = $this->chance(70) ? fake()->randomElement($characters) : null;

            return [
                'text' => fake()->sentences(fake()->numberBetween(1, 3), true),
                'character_id' => $speaker,
                'appearance_id' => null,
                'speaker_name' => $speaker === null && $this->chance(50) ? fake()->firstName() : null,
                'speaker_color' => $speaker === null ? fake()->hexColor() : null,
                'speaker_position' => fake()->randomElement(['left', 'center', 'right']),
                'sprites' => collect(fake()->randomElements($characters, fake()->numberBetween(0, min(2, count($characters)))))
                    ->map(fn (int $id) => [
                        'character_id' => $id,
                        'appearance_id' => null,
                        'x' => fake()->randomFloat(2, 0.1, 0.9),
                        'y' => 0,
                        'scale' => fake()->randomFloat(2, 0.6, 1.1),
                        'flip' => fake()->boolean(),
                    ])->values()->all(),
            ];
        }

        if ($type === 'choice') {
            return [
                'prompt' => $this->chance(60) ? fake()->sentence(4).'?' : null,
                'options' => array_map(
                    fn () => ['text' => ucfirst(fake()->words(fake()->numberBetween(1, 4), true)), 'target_scene_id' => null],
                    range(1, fake()->numberBetween(2, 4)),
                ),
            ];
        }

        return [
            'asset_path' => $videos ? fake()->randomElement($videos) : null,
            'loop' => false,
            'skippable' => fake()->boolean(80),
        ];
    }

    /**
     * Second pass: point roughly half of all choice options at random scenes
     * or groups (the rest keep "continue to next in order").
     *
     * @param  list<Scene>  $choices
     * @param  list<Scene>  $created
     */
    private function connectChoices(array $choices, array $created): void
    {
        if (! $choices || ! $created) {
            return;
        }

        foreach ($choices as $choice) {
            $options = array_map(function (array $option) use ($created, $choice) {
                if ($this->chance(50)) {
                    $target = fake()->randomElement($created);
                    if ($target->id !== $choice->id) {
                        $option['target_scene_id'] = $target->id;
                    }
                }

                return $option;
            }, $choice->data['options'] ?? []);

            $this->scenes->update($choice, ['data' => [...$choice->data, 'options' => $options]]);
        }
    }

    private function chance(int $percent): bool
    {
        return fake()->numberBetween(1, 100) <= $percent;
    }
}
