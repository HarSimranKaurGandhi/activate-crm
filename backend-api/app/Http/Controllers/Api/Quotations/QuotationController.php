<?php

namespace App\Http\Controllers\Api\Quotations;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Quotations\QuotationIndexRequest;
use App\Http\Requests\Quotations\QuotationRequest;
use App\Http\Requests\Quotations\QuotationStatusRequest;
use App\Http\Resources\QuotationResource;
use App\Services\QuotationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuotationController extends ApiController
{
    public function __construct(private QuotationService $quotations)
    {
    }

    public function index(QuotationIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Quotations fetched successfully',
            $this->quotations->paginate($request),
            QuotationResource::class
        );
    }

    public function store(QuotationRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;

        return $this->ok('Quotation created successfully', new QuotationResource($this->quotations->create($data)), [], 201);
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok('Quotation fetched successfully', new QuotationResource($this->quotations->find($id)));
    }

    public function update(QuotationRequest $request, int|string $id): JsonResponse
    {
        return $this->ok(
            'Quotation updated successfully',
            new QuotationResource($this->quotations->update($this->quotations->find($id), $request->validated()))
        );
    }

    public function duplicate(Request $request, int|string $id): JsonResponse
    {
        return $this->ok(
            'Quotation duplicated successfully',
            new QuotationResource($this->quotations->duplicate($this->quotations->find($id), $request->user()->id)),
            [],
            201
        );
    }

    public function preview(int|string $id): JsonResponse
    {
        $quotation = $this->quotations->find($id);

        return $this->ok('Quotation preview fetched successfully', [
            'quotation' => new QuotationResource($quotation),
            'requires_watermark' => $quotation->status !== 'approved',
        ]);
    }

    public function pdf(int|string $id): JsonResponse
    {
        return $this->ok('Quotation PDF job prepared successfully', [
            'quotation' => new QuotationResource($this->quotations->find($id)),
            'pdf_url' => null,
            'message' => 'Attach a PDF renderer such as DomPDF/Snappy here during PDF implementation.',
        ]);
    }

    public function defaults(): JsonResponse
    {
        return $this->ok('Quotation defaults fetched successfully', $this->quotations->defaults());
    }

    public function status(QuotationStatusRequest $request, int|string $id): JsonResponse
    {
        $quotation = $this->quotations->find($id);

        return $this->ok('Quotation status updated successfully', new QuotationResource($this->quotations->update($quotation, $request->validated())));
    }
}
