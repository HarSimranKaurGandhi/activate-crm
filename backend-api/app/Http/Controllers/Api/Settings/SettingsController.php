<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Settings\BankDetailRequest;
use App\Http\Requests\Settings\CompanySettingsRequest;
use App\Http\Requests\Settings\QuotationNumberingRequest;
use App\Http\Resources\CompanyBankDetailResource;
use App\Http\Resources\CompanySettingsResource;
use App\Http\Resources\QuotationNumberingResource;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;

class SettingsController extends ApiController
{
    public function __construct(private SettingsService $settings)
    {
    }

    public function company(): JsonResponse
    {
        return $this->ok(
            'Company settings fetched successfully',
            new CompanySettingsResource($this->settings->company())
        );
    }

    public function updateCompany(CompanySettingsRequest $request): JsonResponse
    {
        return $this->ok(
            'Company settings updated successfully',
            new CompanySettingsResource($this->settings->updateCompany($request->validated()))
        );
    }

    public function bankDetails(): JsonResponse
    {
        return $this->ok(
            'Bank details fetched successfully',
            CompanyBankDetailResource::collection($this->settings->bankDetails())
        );
    }

    public function storeBankDetail(BankDetailRequest $request): JsonResponse
    {
        return $this->ok(
            'Bank detail created successfully',
            new CompanyBankDetailResource($this->settings->createBankDetail($request->validated())),
            [],
            201
        );
    }

    public function updateBankDetail(BankDetailRequest $request, int|string $id): JsonResponse
    {
        return $this->ok(
            'Bank detail updated successfully',
            new CompanyBankDetailResource($this->settings->updateBankDetail($this->settings->findBankDetail($id), $request->validated()))
        );
    }

    public function makeDefaultBankDetail(int|string $id): JsonResponse
    {
        return $this->ok(
            'Default bank detail updated successfully',
            new CompanyBankDetailResource($this->settings->makeDefaultBankDetail($this->settings->findBankDetail($id)))
        );
    }

    public function quotationNumbering(): JsonResponse
    {
        return $this->ok(
            'Quotation numbering fetched successfully',
            new QuotationNumberingResource($this->settings->quotationNumbering())
        );
    }

    public function updateQuotationNumbering(QuotationNumberingRequest $request): JsonResponse
    {
        return $this->ok(
            'Quotation numbering updated successfully',
            new QuotationNumberingResource($this->settings->updateQuotationNumbering($request->validated()))
        );
    }
}
