<?php

namespace App\Nodes;

use InvalidArgumentException;

class NodeTypeRegistry
{
    /** @var array<string, NodeType> */
    private array $types = [];

    public function register(NodeType $type): void
    {
        $this->types[$type->type()] = $type;
    }

    public function get(string $type): NodeType
    {
        return $this->types[$type]
            ?? throw new InvalidArgumentException("Unknown scene type [{$type}].");
    }

    public function has(string $type): bool
    {
        return isset($this->types[$type]);
    }

    /** @return list<string> */
    public function typeNames(): array
    {
        return array_keys($this->types);
    }
}
