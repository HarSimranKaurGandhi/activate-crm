<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Customers\CustomerController;
use App\Http\Controllers\Api\Dashboard\DashboardController;
use App\Http\Controllers\Api\Logs\ActivityLogController;
use App\Http\Controllers\Api\Masters\AdjustmentController;
use App\Http\Controllers\Api\Masters\BrandController;
use App\Http\Controllers\Api\Masters\CategoryController;
use App\Http\Controllers\Api\Masters\CustomerFieldController;
use App\Http\Controllers\Api\Masters\ProductController;
use App\Http\Controllers\Api\Masters\TermController;
use App\Http\Controllers\Api\Quotations\QuotationApprovalController;
use App\Http\Controllers\Api\Quotations\QuotationController;
use App\Http\Controllers\Api\Reports\ReportController;
use App\Http\Controllers\Api\Settings\SettingsController;
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

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('dashboard/quotation-summary', [DashboardController::class, 'quotationSummary']);

    Route::middleware('role:admin')->group(function (): void {
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store']);
        Route::patch('users/{id}/status', [UserController::class, 'status']);
        Route::get('users/{id}', [UserController::class, 'show']);
        Route::put('users/{id}', [UserController::class, 'update']);
        Route::get('roles', [RoleController::class, 'index']);
    });

    Route::get('categories/dropdown', [CategoryController::class, 'dropdown']);
    Route::get('categories', [CategoryController::class, 'index']);
    Route::post('categories', [CategoryController::class, 'store']);
    Route::patch('categories/{id}/status', [CategoryController::class, 'status']);
    Route::get('categories/{id}', [CategoryController::class, 'show']);
    Route::put('categories/{id}', [CategoryController::class, 'update']);

    Route::get('brands/dropdown', [BrandController::class, 'dropdown']);
    Route::get('brands', [BrandController::class, 'index']);
    Route::post('brands', [BrandController::class, 'store']);
    Route::patch('brands/{id}/status', [BrandController::class, 'status']);
    Route::get('brands/{id}', [BrandController::class, 'show']);
    Route::put('brands/{id}', [BrandController::class, 'update']);

    Route::get('products/selectable', [ProductController::class, 'selectable']);
    Route::get('products', [ProductController::class, 'index']);
    Route::post('products', [ProductController::class, 'store']);
    Route::patch('products/{id}/status', [ProductController::class, 'status']);
    Route::get('products/{id}', [ProductController::class, 'show']);
    Route::put('products/{id}', [ProductController::class, 'update']);

    Route::get('adjustments/active', [AdjustmentController::class, 'active']);
    Route::post('adjustments/reorder', [AdjustmentController::class, 'reorder']);
    Route::get('adjustments', [AdjustmentController::class, 'index']);
    Route::post('adjustments', [AdjustmentController::class, 'store']);
    Route::patch('adjustments/{id}/status', [AdjustmentController::class, 'status']);
    Route::get('adjustments/{id}', [AdjustmentController::class, 'show']);
    Route::put('adjustments/{id}', [AdjustmentController::class, 'update']);

    Route::get('terms/active', [TermController::class, 'active']);
    Route::post('terms/reorder', [TermController::class, 'reorder']);
    Route::get('terms', [TermController::class, 'index']);
    Route::post('terms', [TermController::class, 'store']);
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
    Route::patch('customers/{id}/status', [CustomerController::class, 'status']);
    Route::get('customers/{id}', [CustomerController::class, 'show']);
    Route::put('customers/{id}', [CustomerController::class, 'update']);

    Route::get('quotations/defaults', [QuotationController::class, 'defaults']);
    Route::get('quotations/{id}/preview', [QuotationController::class, 'preview']);
    Route::get('quotations/{id}/pdf', [QuotationController::class, 'pdf']);
    Route::post('quotations/{id}/duplicate', [QuotationController::class, 'duplicate']);
    Route::patch('quotations/{id}/status', [QuotationController::class, 'status']);
    Route::post('quotations/{id}/submit-for-approval', [QuotationApprovalController::class, 'submit']);
    Route::post('quotations/{id}/approve', [QuotationApprovalController::class, 'approve'])->middleware('role:admin,operations');
    Route::post('quotations/{id}/reject', [QuotationApprovalController::class, 'reject'])->middleware('role:admin,operations');
    Route::post('quotations/{id}/revise', [QuotationApprovalController::class, 'revise'])->middleware('role:admin,operations');
    Route::get('quotations/{id}/activity', [QuotationApprovalController::class, 'activity']);
    Route::get('quotations', [QuotationController::class, 'index']);
    Route::post('quotations', [QuotationController::class, 'store']);
    Route::get('quotations/{id}', [QuotationController::class, 'show']);
    Route::put('quotations/{id}', [QuotationController::class, 'update']);

    Route::get('settings/company', [SettingsController::class, 'company']);
    Route::put('settings/company', [SettingsController::class, 'updateCompany']);
    Route::get('settings/bank-details', [SettingsController::class, 'bankDetails']);
    Route::post('settings/bank-details', [SettingsController::class, 'storeBankDetail']);
    Route::put('settings/bank-details/{id}', [SettingsController::class, 'updateBankDetail']);
    Route::patch('settings/bank-details/{id}/default', [SettingsController::class, 'makeDefaultBankDetail']);
    Route::get('settings/quotation-numbering', [SettingsController::class, 'quotationNumbering']);
    Route::put('settings/quotation-numbering', [SettingsController::class, 'updateQuotationNumbering']);

    Route::get('reports/quotations', [ReportController::class, 'quotations']);
    Route::get('reports/quotations/export', [ReportController::class, 'export']);

    Route::get('activity-logs', [ActivityLogController::class, 'index']);
});
