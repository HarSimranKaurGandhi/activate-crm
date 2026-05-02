# Project Output

## Review Cleanup Notes

- Controller namespaces now match the route imports in `routes/api.php`.
- `role` middleware is registered in `bootstrap/app.php`.
- API list responses use one pagination wrapper with `meta.pagination`.
- Authenticated module routes are protected by `auth:sanctum`; user management is admin-only and quotation approval actions are admin/operations-only where required.
- Removed unused generic scaffold files: `CrudController`, `BaseResource`, `PaginationRequest`, and `ActivityLogger`.
- Added explicit resources/services for auth, roles, reports, activity logs, and quotation item discount overrides.
- Added missing relationship helpers for file uploads, quotation files, approvals, adjustment/term snapshots, approvers, and discount override creators.
- `Throwable` is imported for global API exception handling.
- `.env.example` includes Hostinger-style remote MariaDB placeholders, charset/collation, and optional SSL CA support.
- No migrations are included for the existing quotation tables.
- Sanctum login still requires the standard `personal_access_tokens` table to exist.

## Full File Tree

```text
backend-api/.env.example
backend-api/README.md
backend-api/PROJECT_OUTPUT.md
backend-api/app/Http/Controllers/Api/ApiController.php
backend-api/app/Http/Controllers/Api/Auth/AuthController.php
backend-api/app/Http/Controllers/Api/Customers/CustomerController.php
backend-api/app/Http/Controllers/Api/Dashboard/DashboardController.php
backend-api/app/Http/Controllers/Api/Logs/ActivityLogController.php
backend-api/app/Http/Controllers/Api/Masters/AdjustmentController.php
backend-api/app/Http/Controllers/Api/Masters/BrandController.php
backend-api/app/Http/Controllers/Api/Masters/CategoryController.php
backend-api/app/Http/Controllers/Api/Masters/CustomerFieldController.php
backend-api/app/Http/Controllers/Api/Masters/ProductController.php
backend-api/app/Http/Controllers/Api/Masters/TermController.php
backend-api/app/Http/Controllers/Api/Quotations/QuotationApprovalController.php
backend-api/app/Http/Controllers/Api/Quotations/QuotationController.php
backend-api/app/Http/Controllers/Api/Reports/ReportController.php
backend-api/app/Http/Controllers/Api/Settings/SettingsController.php
backend-api/app/Http/Controllers/Api/Users/RoleController.php
backend-api/app/Http/Controllers/Api/Users/UserController.php
backend-api/app/Http/Middleware/RoleMiddleware.php
backend-api/app/Http/Requests/Auth/LoginRequest.php
backend-api/app/Http/Requests/Common/ReorderRequest.php
backend-api/app/Http/Requests/Common/StatusRequest.php
backend-api/app/Http/Requests/Customers/CustomerIndexRequest.php
backend-api/app/Http/Requests/Customers/CustomerRequest.php
backend-api/app/Http/Requests/Dashboard/QuotationSummaryRequest.php
backend-api/app/Http/Requests/Logs/ActivityLogIndexRequest.php
backend-api/app/Http/Requests/Masters/AdjustmentIndexRequest.php
backend-api/app/Http/Requests/Masters/AdjustmentRequest.php
backend-api/app/Http/Requests/Masters/BrandIndexRequest.php
backend-api/app/Http/Requests/Masters/BrandRequest.php
backend-api/app/Http/Requests/Masters/CategoryIndexRequest.php
backend-api/app/Http/Requests/Masters/CategoryRequest.php
backend-api/app/Http/Requests/Masters/CustomerFieldIndexRequest.php
backend-api/app/Http/Requests/Masters/CustomerFieldRequest.php
backend-api/app/Http/Requests/Masters/ProductIndexRequest.php
backend-api/app/Http/Requests/Masters/ProductRequest.php
backend-api/app/Http/Requests/Masters/TermIndexRequest.php
backend-api/app/Http/Requests/Masters/TermRequest.php
backend-api/app/Http/Requests/Quotations/ApprovalRequest.php
backend-api/app/Http/Requests/Quotations/QuotationIndexRequest.php
backend-api/app/Http/Requests/Quotations/QuotationRequest.php
backend-api/app/Http/Requests/Quotations/QuotationStatusRequest.php
backend-api/app/Http/Requests/Quotations/RejectQuotationRequest.php
backend-api/app/Http/Requests/Quotations/ReviseQuotationRequest.php
backend-api/app/Http/Requests/Reports/QuotationReportRequest.php
backend-api/app/Http/Requests/Settings/BankDetailRequest.php
backend-api/app/Http/Requests/Settings/CompanySettingsRequest.php
backend-api/app/Http/Requests/Settings/QuotationNumberingRequest.php
backend-api/app/Http/Requests/Users/StoreUserRequest.php
backend-api/app/Http/Requests/Users/UserIndexRequest.php
backend-api/app/Http/Requests/Users/UpdateUserRequest.php
backend-api/app/Http/Resources/AdjustmentResource.php
backend-api/app/Http/Resources/ActivityLogResource.php
backend-api/app/Http/Resources/AuthResource.php
backend-api/app/Http/Resources/BrandDropdownResource.php
backend-api/app/Http/Resources/BrandResource.php
backend-api/app/Http/Resources/CategoryDropdownResource.php
backend-api/app/Http/Resources/CategoryResource.php
backend-api/app/Http/Resources/CompanyBankDetailResource.php
backend-api/app/Http/Resources/CompanySettingsResource.php
backend-api/app/Http/Resources/CustomerFieldResource.php
backend-api/app/Http/Resources/CustomerFieldValueResource.php
backend-api/app/Http/Resources/CustomerQuotationResource.php
backend-api/app/Http/Resources/CustomerResource.php
backend-api/app/Http/Resources/ProductResource.php
backend-api/app/Http/Resources/ProductSelectableResource.php
backend-api/app/Http/Resources/QuotationAdjustmentResource.php
backend-api/app/Http/Resources/QuotationActivityResource.php
backend-api/app/Http/Resources/QuotationApprovalResource.php
backend-api/app/Http/Resources/QuotationItemDiscountOverrideResource.php
backend-api/app/Http/Resources/QuotationItemResource.php
backend-api/app/Http/Resources/QuotationNumberingResource.php
backend-api/app/Http/Resources/QuotationReportResource.php
backend-api/app/Http/Resources/QuotationResource.php
backend-api/app/Http/Resources/QuotationTermResource.php
backend-api/app/Http/Resources/RoleDropdownResource.php
backend-api/app/Http/Resources/TermResource.php
backend-api/app/Http/Resources/UserResource.php
backend-api/app/Models/ActivityLog.php
backend-api/app/Models/AdjustmentMaster.php
backend-api/app/Models/Brand.php
backend-api/app/Models/Category.php
backend-api/app/Models/CompanyBankDetail.php
backend-api/app/Models/CompanySetting.php
backend-api/app/Models/Customer.php
backend-api/app/Models/CustomerFieldDefinition.php
backend-api/app/Models/CustomerFieldValue.php
backend-api/app/Models/FileUpload.php
backend-api/app/Models/LoginLog.php
backend-api/app/Models/PasswordReset.php
backend-api/app/Models/Permission.php
backend-api/app/Models/Product.php
backend-api/app/Models/Quotation.php
backend-api/app/Models/QuotationAdjustment.php
backend-api/app/Models/QuotationApproval.php
backend-api/app/Models/QuotationFile.php
backend-api/app/Models/QuotationItem.php
backend-api/app/Models/QuotationItemDiscountOverride.php
backend-api/app/Models/QuotationNumberSetting.php
backend-api/app/Models/QuotationTerm.php
backend-api/app/Models/Role.php
backend-api/app/Models/RolePermission.php
backend-api/app/Models/TermMaster.php
backend-api/app/Models/User.php
backend-api/app/Policies/QuotationPolicy.php
backend-api/app/Providers/AppServiceProvider.php
backend-api/app/Services/ActivityLogService.php
backend-api/app/Services/AdjustmentService.php
backend-api/app/Services/AuthService.php
backend-api/app/Services/BrandService.php
backend-api/app/Services/CategoryService.php
backend-api/app/Services/CrudService.php
backend-api/app/Services/CustomerFieldService.php
backend-api/app/Services/CustomerService.php
backend-api/app/Services/DashboardService.php
backend-api/app/Services/MasterService.php
backend-api/app/Services/ProductService.php
backend-api/app/Services/QuotationCalculator.php
backend-api/app/Services/QuotationApprovalService.php
backend-api/app/Services/QuotationService.php
backend-api/app/Services/ReportService.php
backend-api/app/Services/RoleService.php
backend-api/app/Services/SettingsService.php
backend-api/app/Services/TermService.php
backend-api/app/Services/UserService.php
backend-api/app/Support/ApiResponse.php
backend-api/artisan
backend-api/bootstrap/app.php
backend-api/bootstrap/providers.php
backend-api/composer.json
backend-api/config/app.php
backend-api/config/auth.php
backend-api/config/cache.php
backend-api/config/cors.php
backend-api/config/database.php
backend-api/config/filesystems.php
backend-api/config/logging.php
backend-api/config/queue.php
backend-api/config/sanctum.php
backend-api/config/session.php
backend-api/public/.htaccess
backend-api/public/index.php
backend-api/routes/api.php
backend-api/routes/console.php
backend-api/storage/app/public/.gitkeep
backend-api/storage/framework/cache/.gitkeep
backend-api/storage/framework/cache/data/.gitkeep
backend-api/storage/framework/sessions/.gitkeep
backend-api/storage/framework/views/.gitkeep
backend-api/storage/logs/.gitkeep
```

## Created Routes

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/dashboard/quotation-summary
GET    /api/users
POST   /api/users
GET    /api/users/{id}
PUT    /api/users/{id}
PATCH  /api/users/{id}/status
GET    /api/roles
GET    /api/categories
POST   /api/categories
GET    /api/categories/dropdown
GET    /api/categories/{id}
PUT    /api/categories/{id}
PATCH  /api/categories/{id}/status
GET    /api/brands
POST   /api/brands
GET    /api/brands/dropdown
GET    /api/brands/{id}
PUT    /api/brands/{id}
PATCH  /api/brands/{id}/status
GET    /api/products
POST   /api/products
GET    /api/products/selectable
GET    /api/products/{id}
PUT    /api/products/{id}
PATCH  /api/products/{id}/status
GET    /api/adjustments
POST   /api/adjustments
GET    /api/adjustments/active
POST   /api/adjustments/reorder
GET    /api/adjustments/{id}
PUT    /api/adjustments/{id}
PATCH  /api/adjustments/{id}/status
GET    /api/terms
POST   /api/terms
GET    /api/terms/active
POST   /api/terms/reorder
GET    /api/terms/{id}
PUT    /api/terms/{id}
PATCH  /api/terms/{id}/status
GET    /api/customer-fields
POST   /api/customer-fields
POST   /api/customer-fields/reorder
GET    /api/customer-fields/{id}
PUT    /api/customer-fields/{id}
DELETE /api/customer-fields/{id}
PATCH  /api/customer-fields/{id}/status
GET    /api/customers
POST   /api/customers
GET    /api/customers/{id}
PUT    /api/customers/{id}
PATCH  /api/customers/{id}/status
GET    /api/customers/{id}/quotations
GET    /api/quotations
POST   /api/quotations
GET    /api/quotations/defaults
GET    /api/quotations/{id}
PUT    /api/quotations/{id}
PATCH  /api/quotations/{id}/status
POST   /api/quotations/{id}/duplicate
GET    /api/quotations/{id}/preview
GET    /api/quotations/{id}/pdf
POST   /api/quotations/{id}/submit-for-approval
POST   /api/quotations/{id}/approve
POST   /api/quotations/{id}/reject
POST   /api/quotations/{id}/revise
GET    /api/quotations/{id}/activity
GET    /api/settings/company
PUT    /api/settings/company
GET    /api/settings/bank-details
POST   /api/settings/bank-details
PUT    /api/settings/bank-details/{id}
PATCH  /api/settings/bank-details/{id}/default
GET    /api/settings/quotation-numbering
PUT    /api/settings/quotation-numbering
GET    /api/reports/quotations
GET    /api/reports/quotations/export
GET    /api/activity-logs
```

## Recommended Module Implementation Order

1. Confirm exact Hostinger SQL columns against every model fillable/cast.
2. Install Laravel dependencies and run `php artisan route:list`.
3. Verify Sanctum token table availability or publish Sanctum migration only for `personal_access_tokens`.
4. Seed or confirm roles: `admin`, `sales`, `operations`.
5. Finalize Auth, Users, Roles, and permissions.
6. Finalize masters: categories, brands, products, adjustments, terms, customer fields.
7. Finalize customer dynamic field save/retrieval.
8. Finalize quotation calculation test cases.
9. Add PDF renderer and report export implementation.
10. Add feature tests for approval status flow and role restrictions.
