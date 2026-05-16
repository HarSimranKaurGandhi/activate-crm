<?php

namespace App\Services;

use App\Models\CompanyBankDetail;
use App\Models\CompanySetting;
use App\Models\QuotationNumberSetting;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class SettingsService
{
    public function company(): ?CompanySetting
    {
        return CompanySetting::first();
    }

    public function updateCompany(array $data): CompanySetting
    {
        $settings = CompanySetting::query()->firstOrNew(['id' => 1]);
        $data = $this->storeCompanyAssets($data, $settings);
        $data = $this->filterCompanyColumns($data);
        $settings->fill($data)->save();

        return $settings->refresh();
    }

    private function storeCompanyAssets(array $data, CompanySetting $settings): array
    {
        if (($data['logo_file'] ?? null) instanceof UploadedFile) {
            if ($settings->logo_path) {
                Storage::disk('public')->delete($settings->logo_path);
            }

            $data['logo_path'] = $data['logo_file']->store('company-settings/logos', 'public');
        }

        if (($data['letterhead_file'] ?? null) instanceof UploadedFile) {
            if ($settings->letterhead_path) {
                Storage::disk('public')->delete($settings->letterhead_path);
            }

            $data['letterhead_path'] = $data['letterhead_file']->store('company-settings/letterheads', 'public');
        }

        unset($data['logo_file'], $data['letterhead_file']);

        return $data;
    }

    private function filterCompanyColumns(array $data): array
    {
        $allowed = Schema::getColumnListing('company_settings');

        return Arr::only($data, $allowed);
    }

    public function bankDetails(): Collection
    {
        $columns = Schema::getColumnListing('company_bank_details');
        $query = CompanyBankDetail::query();

        if (in_array('is_default', $columns, true)) {
            $query->orderByDesc('is_default');
        }

        if (in_array('is_active', $columns, true)) {
            $query->orderByDesc('is_active');
        }

        if (in_array('bank_name', $columns, true)) {
            $query->orderBy('bank_name');
        }

        return $query->get();
    }

    public function findBankDetail(int|string $id): CompanyBankDetail
    {
        return CompanyBankDetail::query()->findOrFail($id);
    }

    public function createBankDetail(array $data): CompanyBankDetail
    {
        return DB::transaction(function () use ($data): CompanyBankDetail {
            $data = $this->filterBankColumns($data);
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
            $data = $this->filterBankColumns($data);
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
            $columns = Schema::getColumnListing('company_bank_details');

            if (in_array('is_default', $columns, true)) {
                CompanyBankDetail::query()->update(['is_default' => false]);
            }

            $updates = [];

            if (in_array('is_default', $columns, true)) {
                $updates['is_default'] = true;
            }

            if (in_array('is_active', $columns, true)) {
                $updates['is_active'] = true;
            }

            if ($updates !== []) {
                $bank->update($updates);
            }

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
        $settings->fill($this->filterQuotationNumberingColumns($data))->save();

        return $settings->refresh();
    }

    private function filterBankColumns(array $data): array
    {
        $allowed = Schema::getColumnListing('company_bank_details');

        return Arr::only($data, $allowed);
    }

    private function filterQuotationNumberingColumns(array $data): array
    {
        $allowed = Schema::getColumnListing('quotation_number_settings');

        return Arr::only($data, $allowed);
    }
}
