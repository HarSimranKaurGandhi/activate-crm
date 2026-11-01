<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('customers', 'gst_number')) {
            Schema::table('customers', function (Blueprint $table): void {
                $table->string('gst_number', 15)->nullable()->after('company_name');
                $table->index('gst_number');
            });
        }

        DB::table('customers')
            ->where(fn ($query) => $query->whereNull('company_name')->orWhere('company_name', ''))
            ->update(['customer_type' => 'individual']);

        DB::table('customers')
            ->whereNotNull('company_name')
            ->where('company_name', '<>', '')
            ->update(['customer_type' => 'business']);

        DB::table('leads')
            ->where('status', 'closed_success')
            ->orderBy('id')
            ->chunkById(100, function ($leads): void {
                foreach ($leads as $lead) {
                    $phone = trim((string) $lead->phone);
                    $email = strtolower(trim((string) $lead->email));

                    $exists = DB::table('customers')
                        ->where(function ($query) use ($phone, $email): void {
                            if ($phone !== '') {
                                $query->where('phone', $phone);
                            }
                            if ($email !== '') {
                                $phone !== '' ? $query->orWhere('email', $email) : $query->where('email', $email);
                            }
                            if ($phone === '' && $email === '') {
                                $query->whereRaw('1 = 0');
                            }
                        })
                        ->exists();

                    if ($exists) {
                        continue;
                    }

                    DB::table('customers')->insert([
                        'customer_type' => 'individual',
                        'primary_name' => trim((string) $lead->name) ?: "Lead {$lead->id}",
                        'company_name' => null,
                        'gst_number' => null,
                        'phone' => $phone ?: null,
                        'email' => $email ?: null,
                        'address_line_1' => $lead->address_line_1,
                        'address_line_2' => $lead->address_line_2,
                        'city' => $lead->city,
                        'state' => $lead->state,
                        'pincode' => $lead->pincode,
                        'country' => $lead->country ?: 'India',
                        'customer_importance' => $lead->customer_importance,
                        'customer_category' => $lead->customer_category,
                        'notes' => $lead->requirement,
                        'is_active' => true,
                        'created_at' => $lead->created_at ?? now(),
                        'updated_at' => now(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        if (Schema::hasColumn('customers', 'gst_number')) {
            Schema::table('customers', function (Blueprint $table): void {
                $table->dropIndex(['gst_number']);
                $table->dropColumn('gst_number');
            });
        }
    }
};
