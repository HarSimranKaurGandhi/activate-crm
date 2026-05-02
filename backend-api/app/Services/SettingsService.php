<?php

namespace App\Services;

use App\Models\CompanyBankDetail;
use App\Models\CompanySetting;
use App\Models\QuotationNumberSetting;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class SettingsService
{
    public function company(): ?CompanySetting
    {
        return CompanySetting::first();
    }

    public function updateCompany(array $data): CompanySetting
    {
        $settings = CompanySetting::query()->firstOrNew(['id' => 1]);
        $settings->fill($data)->save();

        return $settings->refresh();
    }

    public function bankDetails(): Collection
    {
        return CompanyBankDetail::query()
            ->orderByDesc('is_default')
            ->orderByDesc('is_active')
            ->orderBy('bank_name')
            ->get();
    }

    public function findBankDetail(int|string $id): CompanyBankDetail
    {
        return CompanyBankDetail::query()->findOrFail($id);
    }

    public function createBankDetail(array $data): CompanyBankDetail
    {
        return DB::transaction(function () use ($data): CompanyBankDetail {
            $data['is_active'] = $data['is_active'] ?? true;
            $makeDefault = (bool) ($data['is_default'] ?? false);
            $data['is_default'] = false;

            $bank = CompanyBankDetail::create($data);

            if ($makeDefault) {
                return $this->makeDefaultBankDetail($bank);
            }

            return $bank->refresh();
        });
    }

    public function updateBankDetail(CompanyBankDetail $bank, array $data): CompanyBankDetail
    {
        return DB::transaction(function () use ($bank, $data): CompanyBankDetail {
            $makeDefault = array_key_exists('is_default', $data) && (bool) $data['is_default'];
            unset($data['is_default']);

            $bank->update($data);

            if ($makeDefault) {
                return $this->makeDefaultBankDetail($bank);
            }

            return $bank->refresh();
        });
    }

    public function makeDefaultBankDetail(CompanyBankDetail $bank): CompanyBankDetail
    {
        return DB::transaction(function () use ($bank): CompanyBankDetail {
            CompanyBankDetail::query()->update(['is_default' => false]);
            $bank->update(['is_default' => true, 'is_active' => true]);

            return $bank->refresh();
        });
    }

    public function quotationNumbering(): ?QuotationNumberSetting
    {
        return QuotationNumberSetting::first();
    }

    public function updateQuotationNumbering(array $data): QuotationNumberSetting
    {
        $settings = QuotationNumberSetting::query()->firstOrNew(['id' => 1]);
        $settings->fill($data)->save();

        return $settings->refresh();
    }
}
