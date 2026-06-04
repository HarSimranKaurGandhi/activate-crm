<?php

namespace App\Services;

use App\Models\CompanyBankDetail;
use App\Models\CompanySetting;
use App\Models\QuotationNumberSetting;
use App\Support\PublicAsset;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
        $data = $this->normalizeCompanyData($data);
        $data = $this->filterCompanyColumns($data);
        $settings->fill($data)->save();

        return $settings->refresh();
    }

    private function storeCompanyAssets(array $data, CompanySetting $settings): array
    {
        if (($data['logo_file'] ?? null) instanceof UploadedFile) {
            PublicAsset::delete($settings->logo_path);
            $data['logo_path'] = PublicAsset::store($data['logo_file'], 'uploads/company-settings/logos');
        }

        if (($data['letterhead_file'] ?? null) instanceof UploadedFile) {
            PublicAsset::delete($settings->letterhead_path);
            $data['letterhead_path'] = PublicAsset::store($data['letterhead_file'], 'uploads/company-settings/letterheads');
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
            $data = $this->normalizeBankData($data);
            $data = $this->filterBankColumns($data);
            if (array_key_exists('company_setting_id', $data) === false && in_array('company_setting_id', Schema::getColumnListing('company_bank_details'), true)) {
                $data['company_setting_id'] = CompanySetting::query()->firstOrNew(['id' => 1])->id ?: 1;
            }
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
            $data = $this->normalizeBankData($data);
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
        return QuotationNumberSetting::first() ?? new QuotationNumberSetting();
    }

    public function updateQuotationNumbering(array $data): QuotationNumberSetting
    {
        $settings = QuotationNumberSetting::query()->firstOrNew(['id' => 1]);
        $filtered = $this->filterQuotationNumberingColumns($this->normalizeQuotationNumberingData($data));

        if ($filtered !== []) {
            $settings->fill($filtered)->save();
        }

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

    private function normalizeCompanyData(array $data): array
    {
        if (!array_key_exists('address_line_1', $data) && array_key_exists('address', $data)) {
            $data['address_line_1'] = $data['address'];
        }

        if (!array_key_exists('default_validity_days', $data) && array_key_exists('validity_days', $data)) {
            $data['default_validity_days'] = $data['validity_days'];
        }

        unset($data['address'], $data['validity_days']);

        return $data;
    }

    private function normalizeBankData(array $data): array
    {
        if (!array_key_exists('branch_name', $data) && array_key_exists('branch', $data)) {
            $data['branch_name'] = $data['branch'];
        }

        unset($data['branch']);

        return $data;
    }

    private function normalizeQuotationNumberingData(array $data): array
    {
        if (!array_key_exists('prefix', $data) && array_key_exists('quotation_prefix', $data)) {
            $data['prefix'] = $data['quotation_prefix'];
        }

        if (!array_key_exists('current_sequence', $data) && array_key_exists('next_number', $data)) {
            $data['current_sequence'] = $data['next_number'];
        }

        unset($data['quotation_prefix'], $data['next_number'], $data['padding'], $data['default_validity_days']);

        return $data;
    }
}
