<?php

namespace App\Http\Controllers\Api\Quotations;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Quotations\ApprovalRequest;
use App\Http\Requests\Quotations\RejectQuotationRequest;
use App\Http\Requests\Quotations\ReviseQuotationRequest;
use App\Http\Resources\QuotationActivityResource;
use App\Http\Resources\QuotationResource;
use App\Services\QuotationApprovalService;
use Illuminate\Http\JsonResponse;

class QuotationApprovalController extends ApiController
{
    public function __construct(private QuotationApprovalService $approvals)
    {
    }

    public function submit(ApprovalRequest $request, int|string $id): JsonResponse
    {
        $quotation = $this->approvals->submit($id, $request->user(), $request);

        return $this->ok('Quotation submitted for approval successfully', new QuotationResource($quotation));
    }

    public function approve(ApprovalRequest $request, int|string $id): JsonResponse
    {
        $quotation = $this->approvals->approve($id, $request->user(), $request);

        return $this->ok('Quotation approved successfully', new QuotationResource($quotation));
    }

    public function reject(RejectQuotationRequest $request, int|string $id): JsonResponse
    {
        $quotation = $this->approvals->reject($id, $request->user(), $request);

        return $this->ok('Quotation rejected successfully', new QuotationResource($quotation));
    }

    public function revise(ReviseQuotationRequest $request, int|string $id): JsonResponse
    {
        $quotation = $this->approvals->revise($id, $request->user(), $request);

        return $this->ok('Quotation marked for revision successfully', new QuotationResource($quotation));
    }

    public function activity(int|string $id): JsonResponse
    {
        return $this->ok(
            'Quotation activity fetched successfully',
            QuotationActivityResource::collection($this->approvals->activity($id)),
        );
    }
}
