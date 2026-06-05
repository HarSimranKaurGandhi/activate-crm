<?php

namespace App\Http\Controllers\Api\Tasks;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Tasks\TaskIndexRequest;
use App\Http\Requests\Tasks\TaskRequest;
use App\Http\Resources\TaskResource;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;

class TaskController extends ApiController
{
    public function __construct(private TaskService $tasks)
    {
    }

    public function index(TaskIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Tasks fetched successfully',
            $this->tasks->paginate($request),
            TaskResource::class
        );
    }

    public function store(TaskRequest $request): JsonResponse
    {
        return $this->ok(
            'Task created successfully',
            new TaskResource($this->tasks->create($request->validated())),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok(
            'Task fetched successfully',
            new TaskResource($this->tasks->find($id))
        );
    }

    public function update(TaskRequest $request, int|string $id): JsonResponse
    {
        $task = $this->tasks->find($id);

        return $this->ok(
            'Task updated successfully',
            new TaskResource($this->tasks->update($task, $request->validated()))
        );
    }
}
