<?php

namespace App\Providers;

use App\Nodes\NodeTypeRegistry;
use App\Nodes\Types\ChoiceNodeType;
use App\Nodes\Types\DialogueNodeType;
use App\Nodes\Types\VideoNodeType;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(NodeTypeRegistry::class, function () {
            $registry = new NodeTypeRegistry;

            $registry->register(new DialogueNodeType);
            $registry->register(new ChoiceNodeType);
            $registry->register(new VideoNodeType);

            return $registry;
        });
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();
    }
}
