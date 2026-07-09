<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Nodes\NodeTypeRegistry;

class NodeTypeController extends Controller
{
    public function index(NodeTypeRegistry $registry)
    {
        return response()->json($registry->typeNames());
    }
}
