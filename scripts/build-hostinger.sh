#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Building frontend for Hostinger (production)..."
npm ci
npm run build

echo ""
echo "Build complete. Upload these to public_html on crm.activatefitnessstore.com:"
echo "  - dist/*"
echo "  - deploy/hostinger/frontend.htaccess  → rename/copy to public_html/.htaccess"
echo ""
echo "API URL baked in: ${VITE_API_BASE_URL:-$(grep VITE_API_BASE_URL .env.production 2>/dev/null || echo 'see .env.production')}"
