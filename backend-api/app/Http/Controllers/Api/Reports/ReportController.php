<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Reports\QuotationReportRequest;
use App\Http\Resources\QuotationReportResource;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;

class ReportController extends ApiController
{
    public function __construct(private ReportService $reports)
    {
    }

    public function quotations(QuotationReportRequest $request): JsonResponse
    {
        return $this->paginated(
            'Quotation report fetched successfully',
            $this->reports->quotationReport($request),
            QuotationReportResource::class,
        );
    }

    public function export(QuotationReportRequest $request): JsonResponse
    {
        return $this->ok('Quotation export prepared successfully', $this->reports->quotationExport($request));
    }
}
