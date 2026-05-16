<?php

namespace App\Services;

use App\Models\MeasurementUnit;

class MeasurementUnitService extends CrudService
{
    protected string $modelClass = MeasurementUnit::class;

    protected array $searchColumns = ['code', 'name'];
}
