# Fitness Quotation API

Laravel REST API skeleton for a multi-user quotation management system. The existing Hostinger MariaDB/MySQL schema is the source of truth. No migrations are included.

## Setup

1. Install PHP 8.2+ and Composer.
2. From this directory, run `composer install`.
3. Copy `.env.example` to `.env`.
4. Fill in the Hostinger database credentials:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_DATABASE`
   - `DB_USERNAME`
   - `DB_PASSWORD`
   - `MYSQL_ATTR_SSL_CA` only if Hostinger requires a CA certificate for your database connection.
5. Run `php artisan key:generate`.
6. Install Sanctum tables only if your existing database does not already contain `personal_access_tokens`: `php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"`.
7. Run `php artisan optimize:clear`.
8. Start locally with `php artisan serve` or deploy `public/` as the web root on Hostinger.

## Notes

- The API uses Laravel Sanctum bearer tokens.
- Sanctum requires a `personal_access_tokens` table. This is the only table not listed in the existing quotation schema; confirm it exists before enabling login in production.
- Models are mapped to the existing table names from the quotation schema.
- List endpoints return `{ success, message, data, meta.pagination }`.
- Quotation calculations are implemented in `app/Services/QuotationCalculator.php`.
- PDF/export endpoints return structured placeholders so frontend integration can begin before the renderer/exporter is selected.
- Confirm exact SQL column names against the production schema before first deployment, especially for optional fields such as `display_order`, `is_active`, and settings defaults.

## Deployment On Hostinger

- Point the domain or subdomain document root to `backend-api/public`.
- Keep `.env` outside public access.
- Set `APP_ENV=production` and `APP_DEBUG=false`.
- Run `php artisan config:cache`, `php artisan route:cache`, and `php artisan view:cache` after final `.env` configuration.
- Make sure PHP extensions `pdo_mysql`, `openssl`, `mbstring`, `tokenizer`, `ctype`, `json`, and `fileinfo` are enabled.
