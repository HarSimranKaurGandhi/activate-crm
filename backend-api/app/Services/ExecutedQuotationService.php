<?php

namespace App\Services;

use App\Models\{Customer, Lead, Quotation, User};
use Illuminate\Support\Facades\{DB, Gate};
use Illuminate\Validation\ValidationException;

class ExecutedQuotationService
{
    public function complete(int|string $id, array $data, User $actor, ?string $ip): Quotation
    {
        return DB::transaction(function () use ($id, $data, $actor, $ip) {
            $quote = Quotation::query()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize('view', $quote);
            abort_if($actor->hasAnyRole(['influencer']), 403);
            if ($quote->status !== 'executed') {
                throw ValidationException::withMessages(['status' => 'These actions are available only for executed quotations.']);
            }
            $lead = $quote->lead_id ? Lead::query()->lockForUpdate()->findOrFail($quote->lead_id) : null;
            $leads = app(LeadService::class);
            if (! empty($data['close_lead'])) {
                if (! $lead) {
                    throw ValidationException::withMessages(['lead' => 'This quotation has no linked lead.']);
                }
                if ($lead->status !== 'closed_success') {
                    $leads->update($lead, ['status' => 'closed_success', 'failure_reason' => null, 'failure_reason_details' => null], $actor, $ip);
                }
            }
            if (! empty($data['add_products']) && ! $quote->crm_purchase_date) {
                $customer = $quote->customer_id ? Customer::findOrFail($quote->customer_id) : ($lead ? $leads->customerForLead($lead) : null);
                if (! $customer) {
                    throw ValidationException::withMessages(['customer' => 'This quotation needs a customer or linked lead before adding products.']);
                }
                $customer = Customer::query()->lockForUpdate()->findOrFail($customer->id);
                $items = $quote->items()->get();
                if ($items->isEmpty()) {
                    throw ValidationException::withMessages(['items' => 'This quotation has no products to add.']);
                }
                foreach ($items as $item) {
                    app(CustomerService::class)->addOwnedProduct($customer, [
                        'product_id' => $item->product_id,
                        'product_description' => $item->product_name,
                        'quantity' => $item->quantity,
                        'purchase_date' => $data['purchase_date'],
                    ], $actor);
                }
                $quote->customer_id = $customer->id;
                $quote->crm_purchase_date = $data['purchase_date'];
                $quote->save();
            }
            return $quote->load(['customer', 'lead', 'items', 'adjustments', 'terms']);
        });
    }
}
