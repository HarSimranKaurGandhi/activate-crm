<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Customers\CustomerController;
use App\Http\Controllers\Api\Dashboard\DashboardController;
use App\Http\Controllers\Api\DispatchController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\DispatchHelpBookController;
use App\Http\Controllers\Api\Leads\LeadController;
use App\Http\Controllers\Api\Leads\LeadIntegrationController;
use App\Http\Controllers\Api\Leads\LeadWhatsappFollowUpController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\Influencers\InfluencerController;
use App\Http\Controllers\Api\Logs\ActivityLogController;
use App\Http\Controllers\Api\Masters\AdjustmentController;
use App\Http\Controllers\Api\Masters\BrandController;
use App\Http\Controllers\Api\Masters\CategoryController;
use App\Http\Controllers\Api\Masters\CustomerFieldController;
use App\Http\Controllers\Api\Masters\GodownController;
use App\Http\Controllers\Api\Masters\MeasurementUnitController;
use App\Http\Controllers\Api\Masters\ProductController;
use App\Http\Controllers\Api\Masters\TermController;
use App\Http\Controllers\Api\Quotations\QuotationApprovalController;
use App\Http\Controllers\Api\Quotations\QuotationController;
use App\Http\Controllers\Api\Reports\ReportController;
use App\Http\Controllers\Api\Settings\SettingsController;
use App\Http\Controllers\Api\Settings\LeadApiTokenController;
use App\Http\Controllers\Api\Settings\FeatureRequestController;
use App\Http\Controllers\Api\Services\ServiceRequestController;
use App\Http\Controllers\Api\Services\AmcController;
use App\Http\Controllers\Api\Tasks\TaskController;
use App\Http\Controllers\Api\Users\RoleController;
use App\Http\Controllers\Api\Users\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

Route::post('integrations/leads/batch', [LeadIntegrationController::class, 'store'])->middleware(['auth:sanctum', \App\Http\Middleware\InfluencerAccess::class]);
Route::get('integrations/leads/follow-ups', [LeadWhatsappFollowUpController::class, 'index'])->middleware(['auth:sanctum', \App\Http\Middleware\InfluencerAccess::class]);
Route::post('integrations/leads/follow-ups/{lead}/sent', [LeadWhatsappFollowUpController::class, 'store'])->middleware(['auth:sanctum', \App\Http\Middleware\InfluencerAccess::class]);

Route::middleware(['auth:sanctum','reject.lead.token', \App\Http\Middleware\InfluencerAccess::class])->group(function (): void {
    Route::get('settings/lead-api-tokens', [LeadApiTokenController::class, 'index']);
    Route::post('settings/lead-api-tokens', [LeadApiTokenController::class, 'store']);
    Route::delete('settings/lead-api-tokens/{id}', [LeadApiTokenController::class, 'destroy']);
    Route::get('settings/feature-requests', [FeatureRequestController::class, 'index']);
    Route::post('settings/feature-requests', [FeatureRequestController::class, 'store']);
    Route::delete('settings/feature-requests/{id}', [FeatureRequestController::class, 'destroy']);
    Route::get('dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('dashboard/quotation-summary', [DashboardController::class, 'summary']);
    Route::get('dashboard/leaderboard', [DashboardController::class, 'leaderboard']);
    Route::get('users/dropdown', [UserController::class, 'dropdown']);

    Route::post('influencers/{id}/login-account', [\App\Http\Controllers\Api\Influencers\InfluencerPortalController::class, 'loginAccount'])->middleware('role:admin');
    Route::post('influencer/leads', [\App\Http\Controllers\Api\Influencers\InfluencerPortalController::class, 'createLead']);
    Route::get('influencers/dropdown', [InfluencerController::class, 'dropdown']);
    Route::get('influencers', [InfluencerController::class, 'index']);
    Route::get('quick-replies', [\App\Http\Controllers\Api\Masters\QuickReplyController::class, 'index']);
    Route::post('quick-replies', [\App\Http\Controllers\Api\Masters\QuickReplyController::class, 'store']);
    Route::put('quick-replies/{id}', [\App\Http\Controllers\Api\Masters\QuickReplyController::class, 'update']);
    Route::delete('quick-replies/{id}', [\App\Http\Controllers\Api\Masters\QuickReplyController::class, 'destroy']);
    Route::get('influencer-types', [\App\Http\Controllers\Api\Masters\InfluencerTypeController::class, 'index']);
    Route::post('influencer-types', [\App\Http\Controllers\Api\Masters\InfluencerTypeController::class, 'store']);
    Route::delete('influencer-types/{id}', [\App\Http\Controllers\Api\Masters\InfluencerTypeController::class, 'destroy']);
    Route::post('influencers', [InfluencerController::class, 'store']);
    Route::patch('influencers/{id}/status', [InfluencerController::class, 'status']);
    Route::get('influencers/{id}', [InfluencerController::class, 'show']);
    Route::put('influencers/{id}', [InfluencerController::class, 'update']);

    Route::middleware('role:admin')->group(function (): void {
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store']);
        Route::delete('users/{id}', [UserController::class, 'destroy']);
        Route::patch('users/{id}/status', [UserController::class, 'status']);
        Route::get('users/{id}', [UserController::class, 'show']);
        Route::put('users/{id}', [UserController::class, 'update']);
        Route::get('roles', [RoleController::class, 'index']);
    });

    Route::get('categories/dropdown', [CategoryController::class, 'dropdown']);
    Route::get('tags', [\App\Http\Controllers\Api\Masters\TagController::class, 'index']);
    Route::post('tags', [\App\Http\Controllers\Api\Masters\TagController::class, 'store']);
    Route::put('tags/{id}', [\App\Http\Controllers\Api\Masters\TagController::class, 'update']);
    Route::delete('tags/{id}', [\App\Http\Controllers\Api\Masters\TagController::class, 'destroy']);
    Route::get('categories', [CategoryController::class, 'index']);
    Route::post('categories', [CategoryController::class, 'store']);
    Route::delete('categories/{id}', [CategoryController::class, 'destroy']);
    Route::patch('categories/{id}/status', [CategoryController::class, 'status']);
    Route::get('categories/{id}', [CategoryController::class, 'show']);
    Route::put('categories/{id}', [CategoryController::class, 'update']);

    Route::get('brands/dropdown', [BrandController::class, 'dropdown']);
    Route::get('brands', [BrandController::class, 'index']);
    Route::post('brands', [BrandController::class, 'store']);
    Route::delete('brands/{id}', [BrandController::class, 'destroy']);
    Route::patch('brands/{id}/status', [BrandController::class, 'status']);
    Route::get('brands/{id}', [BrandController::class, 'show']);
    Route::put('brands/{id}', [BrandController::class, 'update']);

    Route::get('measurement-units', [MeasurementUnitController::class, 'index']);
    Route::get('godowns', [GodownController::class, 'index']);
    Route::post('godowns', [GodownController::class, 'store']);
    Route::put('godowns/{id}', [GodownController::class, 'update']);
    Route::delete('godowns/{id}', [GodownController::class, 'destroy']);

    Route::get('inventory/thresholds', [\App\Http\Controllers\Api\InventoryThresholdController::class, 'index']);
    Route::put('inventory/products/{id}/threshold', [\App\Http\Controllers\Api\InventoryThresholdController::class, 'update']);
    Route::get('inventory', [InventoryController::class, 'index']);
    Route::get('inventory/selectable-products', [InventoryController::class, 'selectableProducts']);
    Route::patch('inventory/products/{id}/style', [InventoryController::class, 'updateStyle']);
    Route::get('inventory/products/{id}/stock', [InventoryController::class, 'productStock']);
    Route::get('inventory/movements', [InventoryController::class, 'movements']);
    Route::post('inventory/movements', [InventoryController::class, 'store']);

    Route::get('dispatches/help-book', [DispatchHelpBookController::class, 'index']);
    Route::get('billing/payments', [\App\Http\Controllers\Api\QuotePaymentController::class, 'index']);
    Route::post('billing/payments', [\App\Http\Controllers\Api\QuotePaymentController::class, 'store']);
    Route::patch('billing/payments/{source}/{id}/status', [\App\Http\Controllers\Api\QuotePaymentController::class, 'status']);
    Route::get('billing/payments/custom/{id}/pdf', [\App\Http\Controllers\Api\QuotePaymentController::class, 'download']);
    Route::get('billing/dispatches', [BillingController::class, 'dispatches']);
    Route::get('billing/dispatches/{id}', [BillingController::class, 'source']);
    Route::post('billing/invoices/preview', [BillingController::class, 'preview']);
    Route::get('billing/invoices', [BillingController::class, 'index']);
    Route::post('billing/invoices', [BillingController::class, 'store']);
    Route::get('billing/invoices/{id}/pdf', [BillingController::class, 'pdf']);
    Route::get('billing/invoices/{id}', [BillingController::class, 'show']);
    Route::post('dispatches/help-book', [DispatchHelpBookController::class, 'store']);
    Route::get('dispatches', [DispatchController::class, 'index']);
    Route::post('dispatches', [DispatchController::class, 'store']);
    Route::get('dispatches/{id}', [DispatchController::class, 'show']);
    Route::put('dispatches/{id}', [DispatchController::class, 'update']);
    Route::post('dispatches/{id}/invoice', [DispatchController::class, 'uploadInvoice']);
    Route::patch('dispatches/{id}/reopen', [DispatchController::class, 'reopen']);
    Route::patch('dispatches/{id}/cancel', [DispatchController::class, 'cancel']);
    Route::delete('dispatches/{id}', [DispatchController::class, 'destroy'])->middleware('role:admin');

    Route::get('products/selectable', [ProductController::class, 'selectable']);
    Route::get('products/bulk-sample', [ProductController::class, 'bulkSample']);
    Route::post('products/bulk-upload', [ProductController::class, 'bulkUpload']);
    Route::get('products', [ProductController::class, 'index']);
    Route::post('products', [ProductController::class, 'store']);
    Route::delete('products/{id}', [ProductController::class, 'destroy']);
    Route::patch('products/{id}/status', [ProductController::class, 'status']);
    Route::get('products/{id}', [ProductController::class, 'show']);
    Route::put('products/{id}', [ProductController::class, 'update']);

    Route::get('adjustments/active', [AdjustmentController::class, 'active']);
    Route::post('adjustments/reorder', [AdjustmentController::class, 'reorder']);
    Route::get('adjustments', [AdjustmentController::class, 'index']);
    Route::post('adjustments', [AdjustmentController::class, 'store']);
    Route::delete('adjustments/{id}', [AdjustmentController::class, 'destroy']);
    Route::patch('adjustments/{id}/status', [AdjustmentController::class, 'status']);
    Route::get('adjustments/{id}', [AdjustmentController::class, 'show']);
    Route::put('adjustments/{id}', [AdjustmentController::class, 'update']);

    Route::get('terms/active', [TermController::class, 'active']);
    Route::post('terms/reorder', [TermController::class, 'reorder']);
    Route::get('terms', [TermController::class, 'index']);
    Route::post('terms', [TermController::class, 'store']);
    Route::delete('terms/{id}', [TermController::class, 'destroy']);
    Route::patch('terms/{id}/status', [TermController::class, 'status']);
    Route::get('terms/{id}', [TermController::class, 'show']);
    Route::put('terms/{id}', [TermController::class, 'update']);

    Route::post('customer-fields/reorder', [CustomerFieldController::class, 'reorder']);
    Route::get('customer-fields', [CustomerFieldController::class, 'index']);
    Route::post('customer-fields', [CustomerFieldController::class, 'store']);
    Route::patch('customer-fields/{id}/status', [CustomerFieldController::class, 'status']);
    Route::get('customer-fields/{id}', [CustomerFieldController::class, 'show']);
    Route::put('customer-fields/{id}', [CustomerFieldController::class, 'update']);
    Route::delete('customer-fields/{id}', [CustomerFieldController::class, 'destroy']);

    Route::get('customers', [CustomerController::class, 'index']);
    Route::post('customers', [CustomerController::class, 'store']);
    Route::get('customers/{id}/quotations', [CustomerController::class, 'quotations']);
    Route::post('customers/{id}/generate-requirement', [CustomerController::class, 'generateRequirement']);
    Route::get('customers/{id}/overview', [CustomerController::class, 'overview']);
    Route::post('customers/{id}/owned-products', [CustomerController::class, 'addOwnedProduct']);
    Route::get('customers/{id}/invoices', [\App\Http\Controllers\Api\Customers\CustomerInvoiceController::class, 'index']);
    Route::post('customers/{id}/invoices', [\App\Http\Controllers\Api\Customers\CustomerInvoiceController::class, 'store']);
    Route::delete('customers/{id}/invoices/{invoiceId}', [\App\Http\Controllers\Api\Customers\CustomerInvoiceController::class, 'destroy']);
    Route::get('customers/{id}/invoices/{invoiceId}/download', [\App\Http\Controllers\Api\Customers\CustomerInvoiceController::class, 'download']);
    Route::delete('customers/{id}/owned-products/{ownedProductId}', [CustomerController::class, 'removeOwnedProduct']);
    Route::delete('customers/{id}', [CustomerController::class, 'destroy']);
    Route::patch('customers/{id}/status', [CustomerController::class, 'status']);
    Route::get('customers/{id}', [CustomerController::class, 'show']);
    Route::put('customers/{id}', [CustomerController::class, 'update']);

    Route::get('tasks', [TaskController::class, 'index']);
    Route::post('tasks', [TaskController::class, 'store']);
    Route::get('tasks/{id}', [TaskController::class, 'show']);
    Route::put('tasks/{id}', [TaskController::class, 'update']);
    Route::delete('tasks/{id}', [TaskController::class, 'destroy'])->middleware('role:admin');

    Route::get('spare-part-requests/{id}/activity', [\App\Http\Controllers\Api\Services\SparePartRequestController::class, 'activity']);
    Route::post('spare-part-requests/{id}/comments', [\App\Http\Controllers\Api\Services\SparePartRequestController::class, 'comment']);
    Route::get('spare-part-requests', [\App\Http\Controllers\Api\Services\SparePartRequestController::class, 'index']);
    Route::delete('spare-part-requests/{id}', [\App\Http\Controllers\Api\Services\SparePartRequestController::class, 'destroy']);
    Route::get('spare-part-requests/{id}', [\App\Http\Controllers\Api\Services\SparePartRequestController::class, 'show']);
    Route::put('spare-part-requests/{id}', [\App\Http\Controllers\Api\Services\SparePartRequestController::class, 'update']);
    Route::post('spare-part-requests', [\App\Http\Controllers\Api\Services\SparePartRequestController::class, 'store']);
    Route::get('service-requests/payments', [ServiceRequestController::class, 'payments']);
    Route::patch('service-requests/{id}/payment-submitted', [ServiceRequestController::class, 'submitPayment']);
    Route::get('service-requests', [ServiceRequestController::class, 'index']);
    Route::post('service-requests', [ServiceRequestController::class, 'store']);
    Route::get('service-requests/{id}/activity', [ServiceRequestController::class, 'activity']);
    Route::post('service-requests/{id}/comments', [ServiceRequestController::class, 'comment']);
    Route::patch('service-requests/{id}/reschedule', [ServiceRequestController::class, 'reschedule']);
    Route::get('service-requests/{id}', [ServiceRequestController::class, 'show']);
    Route::put('service-requests/{id}', [ServiceRequestController::class, 'update']);
    Route::delete('service-requests/{id}', [ServiceRequestController::class, 'destroy'])->middleware('role:admin');
    Route::get('amcs', [AmcController::class, 'index']);
    Route::post('amcs', [AmcController::class, 'store']);
    Route::get('amcs/{id}', [AmcController::class, 'show']);
    Route::get('amcs/{id}/activity', [AmcController::class, 'activity']);
    Route::post('amcs/{id}/comments', [AmcController::class, 'comment']);
    Route::get('amcs/{id}/proposal-pdf', [AmcController::class, 'proposalPdf']);
    Route::get('amcs/{id}/details-pdf', [AmcController::class, 'detailsPdf']);
    Route::put('amcs/{id}', [AmcController::class, 'update']);
    Route::delete('amcs/{id}', [AmcController::class, 'destroy'])->middleware('role:admin');
    Route::patch('amcs/{id}/complete-visit', [AmcController::class, 'completeVisit']);
    Route::patch('amcs/{id}/visit-status', [AmcController::class, 'updateVisitStatus']);

    Route::get('leads', [LeadController::class, 'index']);
    Route::get('leads/bulk-sample', [LeadController::class, 'bulkSample']);
    Route::post('leads/bulk-upload', [LeadController::class, 'bulkUpload']);
    Route::patch('leads/bulk-update', [LeadController::class, 'bulkUpdate']);
    Route::post('leads', [LeadController::class, 'store']);
    Route::delete('leads/{id}', [LeadController::class, 'destroy']);
    Route::get('leads/{id}/activity', [LeadController::class, 'activity']);
    Route::get('leads/{id}/quotations', [LeadController::class, 'quotations']);
    Route::post('leads/{id}/comments', [LeadController::class, 'comment']);
    Route::post('leads/{id}/calls', [LeadController::class, 'startCall']);
    Route::patch('leads/{id}/calls/{activityId}', [LeadController::class, 'resolveCall']);
    Route::patch('leads/{id}/favourite', [LeadController::class, 'favourite']);
    Route::get('leads/{id}', [LeadController::class, 'show']);
    Route::put('leads/{id}', [LeadController::class, 'update']);

    Route::get('quotations/defaults', [QuotationController::class, 'defaults']);
    Route::get('quotations/{id}/items/{itemId}/image', [QuotationController::class, 'itemImage']);
    Route::get('quotations/{id}/proforma', [QuotationController::class, 'proforma']);
    Route::get('quotations/{id}/preview', [QuotationController::class, 'preview']);
    Route::get('quotations/{id}/pdf', [QuotationController::class, 'pdf']);
    Route::post('quotations/{id}/duplicate', [QuotationController::class, 'duplicate']);
    Route::get('quotations/{id}/shares', [QuotationController::class, 'shares']);
    Route::put('quotations/{id}/shares', [QuotationController::class, 'share']);
    Route::patch('quotations/{id}/status', [QuotationController::class, 'status']);
    Route::put('quotations/{id}/items/{itemId}/fulfillment', [\App\Http\Controllers\Api\Quotations\OrderFulfillmentController::class, 'update']);
    Route::patch('quotations/{id}/fulfillment', [\App\Http\Controllers\Api\Quotations\OrderFulfillmentController::class, 'bulkUpdate']);
    Route::post('quotations/{id}/submit-for-approval', [QuotationApprovalController::class, 'submit']);
    Route::post('quotations/{id}/approve', [QuotationApprovalController::class, 'approve'])->middleware('role:admin,operations,sales_manager');
    Route::post('quotations/{id}/reject', [QuotationApprovalController::class, 'reject'])->middleware('role:admin,operations,sales_manager');
    Route::post('quotations/{id}/revise', [QuotationApprovalController::class, 'revise'])->middleware('role:admin,operations,sales_manager');
    Route::get('quotations/{id}/activity', [QuotationApprovalController::class, 'activity']);
    Route::post('quotations/{id}/complete-crm', [QuotationController::class, 'completeCrm']);
    Route::get('quotations', [QuotationController::class, 'index']);
    Route::post('quotations', [QuotationController::class, 'store']);
    Route::delete('quotations/{id}', [QuotationController::class, 'destroy']);
    Route::get('quotations/{id}', [QuotationController::class, 'show']);
    Route::put('quotations/{id}', [QuotationController::class, 'update']);

    Route::get('settings/oems', [\App\Http\Controllers\Api\Settings\OemController::class, 'index']);
    Route::patch('spare-part-requests/{id}/oem', [\App\Http\Controllers\Api\Services\SparePartRequestController::class, 'assign']);
    Route::get('settings/company', [SettingsController::class, 'company']);
    Route::get('settings/bank-details', [SettingsController::class, 'bankDetails']);
    Route::get('settings/quotation-numbering', [SettingsController::class, 'quotationNumbering']);

    Route::middleware('role:admin')->group(function (): void {
        Route::post('settings/oems', [\App\Http\Controllers\Api\Settings\OemController::class, 'store']);
        Route::put('settings/oems/{id}', [\App\Http\Controllers\Api\Settings\OemController::class, 'update']);
        Route::put('settings/company', [SettingsController::class, 'updateCompany']);
        Route::post('settings/bank-details', [SettingsController::class, 'storeBankDetail']);
        Route::put('settings/bank-details/{id}', [SettingsController::class, 'updateBankDetail']);
        Route::patch('settings/bank-details/{id}/default', [SettingsController::class, 'makeDefaultBankDetail']);
        Route::put('settings/quotation-numbering', [SettingsController::class, 'updateQuotationNumbering']);
    });

    Route::get('reports/quotations', [ReportController::class, 'quotations']);
    Route::get('reports/quotations/export', [ReportController::class, 'export']);
    Route::get('reports/leaderboard', [ReportController::class, 'leaderboard']);

    Route::get('activity-logs', [ActivityLogController::class, 'index']);
});
