# Deploy Activate CRM on Hostinger (Premium Web Hosting)

This app has two parts:

| Part | Stack | Hostinger location |
|------|--------|-------------------|
| Frontend | React (Vite) static build | `crm.activatefitnessstore.com` → `public_html/` |
| API | Laravel 11 (PHP 8.2+) | `crmapi.activatefitnessstore.com` → `public_html/index.php` loads Laravel from `../laravel` |

Your database is already on Hostinger MySQL (`DB_HOST` in `.env`).

---

## 1. Hostinger setup (hPanel)

1. **SSL** — Websites → your domain → SSL → enable **Free SSL** for `crm.activatefitnessstore.com` and `crmapi.activatefitnessstore.com`.
2. **PHP version** — Websites → PHP Configuration → select **PHP 8.2** or **8.3** for both domains.
3. **Subdomains** — Domains → Subdomains → create `crm` → `crm.activatefitnessstore.com`, and `crmapi` → `crmapi.activatefitnessstore.com`.
4. **API root** — Hostinger Web Hosting normally keeps the web root as `public_html`. Keep Laravel outside that folder and use the `public_html` front-controller files in section 3.

Enable PHP extensions: `pdo_mysql`, `openssl`, `mbstring`, `tokenizer`, `ctype`, `json`, `fileinfo`, `curl`.

---

## 2. Database (phpMyAdmin)

1. hPanel → **Databases** → confirm database/user exist (or create new).
2. Import your full quotation schema if this is a fresh DB.
3. Ensure **`personal_access_tokens`** exists (required for login). If missing, run on the server via SSH:

   ```bash
   cd ~/domains/crmapi.activatefitnessstore.com/laravel
   php artisan migrate --force
   ```

4. Run any SQL patches in `backend-api/database/sql/` that are not yet applied.

---

## 3. Deploy Laravel API

### Folder layout

```text
~/domains/crmapi.activatefitnessstore.com/
  laravel/                 ← upload entire backend-api/ here
    app/
    bootstrap/
    config/
    public/
    routes/
    storage/
    vendor/
    .env
  public_html/             ← Hostinger web root for crmapi.activatefitnessstore.com
    .htaccess
    index.php              ← loads ../laravel/bootstrap/app.php
```

Do **not** put `.env`, `vendor/`, `storage/`, or the Laravel app folders inside `public_html/`.

### Upload

Via **File Manager**, **FTP**, or **Git** (Hostinger Git deploy on Premium):

- Upload `activate-crm/backend-api/` → `~/domains/crmapi.activatefitnessstore.com/laravel/`.
- Upload `deploy/hostinger/api-public-index.php` → `~/domains/crmapi.activatefitnessstore.com/public_html/index.php`.
- Upload `deploy/hostinger/api-public-html.htaccess` → `~/domains/crmapi.activatefitnessstore.com/public_html/.htaccess`.
- **Do not upload**: `node_modules`, `.git`, local `storage/logs/*`, `storage/app/pdf-temp/*`.

### On server (SSH — Premium includes SSH)

```bash
cd ~/domains/crmapi.activatefitnessstore.com/laravel

# Install PHP dependencies (if vendor/ was not uploaded)
composer install --no-dev --optimize-autoloader

# Environment
cp .env.example .env   # or upload your production .env
php artisan key:generate   # only if APP_KEY is empty

# Permissions
chmod -R 775 storage bootstrap/cache

# Public storage (uploads: logos, letterheads, product images)
# Hostinger may disable PHP exec(), which can make `php artisan storage:link` fail.
# This app has a Laravel /storage/* fallback, so you can skip storage:link.

# Optional faster direct symlink, if SSH allows it:
ln -s ../laravel/storage/app/public ../public_html/storage

# If the symlink command says the file already exists, continue.
# If symlinks are not allowed, continue; Laravel serves /storage/* as a fallback.
# If logos/images return 404, confirm files exist in storage/app/public/.

# Cache config for production
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

If Composer says Symfony packages require PHP 8.4, upload the latest `backend-api/composer.json` and `backend-api/composer.lock` from this repo first, then run `composer install --no-dev --optimize-autoloader` again. This repo pins Composer resolution to Hostinger's PHP 8.2.30 so the lock file stays compatible with Premium Web Hosting.

### Production `.env` (API)

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://crmapi.activatefitnessstore.com
FRONTEND_URL=https://crm.activatefitnessstore.com

# If your API web root is a subfolder like public_html/crm_api and Laravel is outside it,
# save uploaded files directly into that public folder:
# PUBLIC_UPLOAD_ROOT=/home/your-user/domains/activatefitnessstore.com/public_html/crm_api

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_db_name
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

SANCTUM_STATEFUL_DOMAINS=crm.activatefitnessstore.com
CORS_ALLOWED_ORIGINS=https://crm.activatefitnessstore.com
```

Use **`localhost`** for `DB_HOST` when PHP runs on the same Hostinger server as MySQL (typical). Use the remote IP only if connecting from outside Hostinger.

If you get `SQLSTATE[HY000] [2002] Operation not permitted`, Laravel cannot reach MySQL with the current host value. In hPanel → Databases → Manage, copy the exact MySQL host shown there. If hPanel shows `localhost`, try `DB_HOST=127.0.0.1` to force TCP instead of a Unix socket. Then clear and rebuild cached config:

```bash
php artisan config:clear
php artisan cache:clear
php artisan config:cache
php artisan migrate:status
```

### Apache: Bearer token support

The uploaded `public_html/.htaccess` should pass the `Authorization` header. Use `deploy/hostinger/api-public-html.htaccess`.

### Test API

Open: `https://crmapi.activatefitnessstore.com/up` — should return a health response.

---

## 4. Deploy React frontend

On your **local machine**:

```bash
cd activate-crm
chmod +x scripts/build-hostinger.sh
./scripts/build-hostinger.sh
```

Or manually:

```bash
npm ci
npm run build   # uses .env.production → VITE_API_BASE_URL=https://crmapi.activatefitnessstore.com/api
```

Upload to `~/domains/crm.activatefitnessstore.com/public_html/`:

- Everything inside `dist/` (`index.html`, `assets/`, …)
- Copy `deploy/hostinger/frontend.htaccess` → `public_html/.htaccess`

Do not upload the Laravel API into the frontend domain's `public_html`.

### Test frontend

1. Open `https://crm.activatefitnessstore.com`
2. Log in — requests should go to `https://crmapi.activatefitnessstore.com/api/...`

---

## 5. PDF export on shared hosting

Set in API `.env`:

```env
QUOTATION_PDF_DRIVER=dompdf
```

Then run `composer install` on the server (includes `barryvdh/laravel-dompdf`) and `php artisan config:cache`.

For higher-fidelity PDFs locally, use `QUOTATION_PDF_DRIVER=playwright` with Node + `npm run playwright:install`.

---

## 6. Post-deploy checklist

- [ ] `https://crm.activatefitnessstore.com` loads the app
- [ ] `https://crmapi.activatefitnessstore.com/up` is healthy
- [ ] Login works (Sanctum token returned)
- [ ] Upload logo/letterhead in Settings (check `storage/app/public` is writable)
- [ ] CORS: no browser errors on API calls from frontend domain
- [ ] `APP_DEBUG=false` in production
- [ ] Rotate DB password if it was ever committed to git

---

## 7. Updating after changes

**Frontend:** rebuild locally → re-upload `dist/` + `.htaccess`.

**API:** upload changed PHP files → SSH:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

**Database patches:** run new files in `backend-api/database/sql/` via phpMyAdmin.
