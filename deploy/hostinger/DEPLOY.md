# Deploy Activate CRM on Hostinger (Premium Web Hosting)

This app has two parts:

| Part | Stack | Hostinger location |
|------|--------|-------------------|
| Frontend | React (Vite) static build | `horizonfitness.in` → `public_html/` |
| API | Laravel 11 (PHP 8.2+) | `api.horizonfitness.in` → document root = `backend-api/public` |

Your database is already on Hostinger MySQL (`DB_HOST` in `.env`).

---

## 1. Hostinger setup (hPanel)

1. **SSL** — Websites → your domain → SSL → enable **Free SSL** for `horizonfitness.in` and `api.horizonfitness.in`.
2. **PHP version** — Websites → PHP Configuration → select **PHP 8.2** or **8.3** for both domains.
3. **Subdomain** — Domains → Subdomains → create `api` → `api.horizonfitness.in`.
4. **API document root** — For `api.horizonfitness.in`, set document root to the Laravel `public` folder (see section 3). In hPanel: Websites → Manage → Domains → pencil icon on subdomain → change folder to e.g. `.../api.horizonfitness.in/laravel/public`.

Enable PHP extensions: `pdo_mysql`, `openssl`, `mbstring`, `tokenizer`, `ctype`, `json`, `fileinfo`, `curl`.

---

## 2. Database (phpMyAdmin)

1. hPanel → **Databases** → confirm database/user exist (or create new).
2. Import your full quotation schema if this is a fresh DB.
3. Ensure **`personal_access_tokens`** exists (required for login). If missing, run on the server via SSH:

   ```bash
   cd ~/domains/api.horizonfitness.in/laravel
   php artisan migrate --force
   ```

4. Run any SQL patches in `backend-api/database/sql/` that are not yet applied.

---

## 3. Deploy Laravel API

### Folder layout (recommended)

```text
~/domains/api.horizonfitness.in/
  laravel/                 ← upload entire backend-api/ here (rename to laravel)
    app/
    bootstrap/
    config/
    public/                ← document root points HERE
    routes/
    storage/
    vendor/
    .env
```

Do **not** put `.env` inside `public/`.

### Upload

Via **File Manager**, **FTP**, or **Git** (Hostinger Git deploy on Premium):

- Upload `activate-crm/backend-api/` → `laravel/` on the server.
- **Do not upload**: `node_modules`, `.git`, local `storage/logs/*`, `storage/app/pdf-temp/*`.

### On server (SSH — Premium includes SSH)

```bash
cd ~/domains/api.horizonfitness.in/laravel

# Install PHP dependencies (if vendor/ was not uploaded)
composer install --no-dev --optimize-autoloader

# Environment
cp .env.example .env   # or upload your production .env
php artisan key:generate   # only if APP_KEY is empty

# Permissions
chmod -R 775 storage bootstrap/cache

# Public storage (uploads: logos, letterheads, product images)
php artisan storage:link

# If logos/images return 404, confirm files exist:
#   storage/app/public/company-settings/logos/
# Re-upload in Settings if you only copied the database from local.
# This app also serves /storage/* via Laravel when the symlink is missing.

# Cache config for production
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Production `.env` (API)

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.horizonfitness.in
FRONTEND_URL=https://horizonfitness.in

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_db_name
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

SANCTUM_STATEFUL_DOMAINS=horizonfitness.in,www.horizonfitness.in
CORS_ALLOWED_ORIGINS=https://horizonfitness.in,https://www.horizonfitness.in
```

Use **`localhost`** for `DB_HOST` when PHP runs on the same Hostinger server as MySQL (typical). Use the remote IP only if connecting from outside Hostinger.

### Apache: Bearer token support

`public/.htaccess` should pass the `Authorization` header (already included in this repo).

### Test API

Open: `https://api.horizonfitness.in/up` — should return a health response.

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
npm run build   # uses .env.production → VITE_API_BASE_URL=https://api.horizonfitness.in/api
```

Upload to `~/domains/horizonfitness.in/public_html/`:

- Everything inside `dist/` (`index.html`, `assets/`, …)
- Copy `deploy/hostinger/frontend.htaccess` → `public_html/.htaccess`

### Test frontend

1. Open `https://horizonfitness.in`
2. Log in — requests should go to `https://api.horizonfitness.in/api/...`

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

- [ ] `https://horizonfitness.in` loads the app
- [ ] `https://api.horizonfitness.in/up` is healthy
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
