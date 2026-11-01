<?php

namespace App\Http\Controllers\Api\Quotations;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Quotations\QuotationIndexRequest;
use App\Http\Requests\Quotations\QuotationRequest;
use App\Http\Requests\Quotations\QuotationStatusRequest;
use App\Http\Resources\QuotationResource;
use App\Services\QuotationPdfService;
use App\Services\QuotationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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
        if ($request->user()->hasAnyRole(['influencer'])) {
            $influencer = $request->attributes->get('influencer');
            abort_unless($influencer && \App\Models\Lead::query()->whereKey($data['lead_id'] ?? 0)->where('influencer_id', $influencer->id)->exists(), 403, 'Select one of your own leads.');
            $data['customer_id'] = null;
            $data['status'] = 'draft';
        }

        return $this->ok('Quotation created successfully', new QuotationResource($this->quotations->create($data)), [], 201);
    }

    public function completeCrm(Request $request, int|string $id): JsonResponse
    {
        $data = $request->validate([
            'close_lead' => ['sometimes', 'boolean'],
            'add_products' => ['sometimes', 'boolean'],
            'purchase_date' => ['nullable', 'required_if:add_products,true', 'date_format:Y-m-d', 'before_or_equal:today'],
        ]);
        if (! $request->boolean('close_lead') && ! $request->boolean('add_products')) {
            throw \Illuminate\Validation\ValidationException::withMessages(['action' => 'Select at least one action.']);
        }
        $quotation = app(\App\Services\ExecutedQuotationService::class)->complete($id, $data, $request->user(), $request->ip());
        return $this->ok('CRM updated successfully', new QuotationResource($quotation));
    }

    public function proforma(\Illuminate\Http\Request $request, int|string $id)
    {
        $data = $request->validate(['tax_mode' => ['required', \Illuminate\Validation\Rule::in(['igst', 'cgst_sgst', 'cgst_utgst'])]]);
        $quotation = $this->quotations->find($id);
        $invoice = app(\App\Services\QuotationProformaService::class)->data($quotation, $data['tax_mode']);
        return app('dompdf.wrapper')->loadView('pdf.tax-invoice', ['invoice' => $invoice])
            ->setPaper('a4')->setOption(['defaultFont' => 'DejaVu Sans', 'isRemoteEnabled' => false])
            ->download('Proforma-'.preg_replace('/[^A-Za-z0-9._-]/', '-', $quotation->quotation_number).'.pdf');
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

    public function destroy(int|string $id): JsonResponse
    {
        $quotation = $this->quotations->find($id);
        Gate::authorize('manageSharing', $quotation);
        $this->quotations->delete($quotation);

        return $this->ok('Quotation deleted successfully');
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
            'requires_watermark' => ! in_array($quotation->status, ['approved', 'locked', 'executed'], true),
        ]);
    }

    public function itemImage(int|string $id, int $itemId): BinaryFileResponse
    {
        $quotation = $this->quotations->find($id);
        $item = $quotation->items()->whereKey($itemId)->firstOrFail();
        $path = \App\Support\PublicAsset::absolutePath($item->product_image_path);
        abort_unless($path && is_file($path), 404, 'Product image is unavailable.');
        $mime = mime_content_type($path);
        abort_unless(in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'], true), 422, 'Unsupported product image format.');
        return response()->file($path, ['Content-Type' => $mime]);
    }

    public function pdf(int|string $id, QuotationPdfService $quotationPdf): BinaryFileResponse
    {
        $result = $quotationPdf->render($this->quotations->find($id));

        return response()->download($result['path'], $result['filename'], [
            'Content-Type' => 'application/pdf',
        ])->deleteFileAfterSend(true);
    }

    public function shares(int|string $id): JsonResponse
    {
        $quotation = $this->quotations->find($id);
        Gate::authorize('manageSharing', $quotation);

        return $this->ok('Quotation sharing fetched successfully', [
            'user_ids' => $quotation->sharedUsers()->pluck('users.id'),
        ]);
    }

    public function share(Request $request, int|string $id): JsonResponse
    {
        $quotation = $this->quotations->find($id);
        Gate::authorize('manageSharing', $quotation);
        $data = $request->validate([
            'user_ids' => ['present', 'array', 'max:100'],
            'user_ids.*' => ['integer', 'distinct', Rule::notIn([$quotation->created_by]), Rule::exists('users', 'id')->where(fn ($query) => $query->where(function ($eligible) use ($quotation): void {
                $eligible->where('is_active', true)->orWhereIn('id', $quotation->sharedUsers()->pluck('users.id'));
            }))],
        ]);
        $quotation->sharedUsers()->sync($data['user_ids']);

        return $this->ok('Quotation sharing updated successfully', [
            'user_ids' => $quotation->sharedUsers()->pluck('users.id'),
        ]);
    }

    public function defaults(): JsonResponse
    {
        return $this->ok('Quotation defaults fetched successfully', $this->quotations->defaults());
    }

    public function status(QuotationStatusRequest $request, int|string $id): JsonResponse
    {
        $quotation = DB::transaction(function () use ($request, $id) {
            $quotation = \App\Models\Quotation::query()->lockForUpdate()->findOrFail($id);
            $data = $request->validated();
            Gate::authorize('changeStatus', [$quotation, $data['status']]);
            $quotation->update($data);

            return $quotation;
        });

        return $this->ok('Quotation status updated successfully', new QuotationResource($quotation->refresh()));
    }
}
