#!/bin/sh
# Run only in the owner's reviewed HTTPS Ploi release directory, as its site user.
set -eu
[ -f .env ] || { echo 'Provision secure .env first.' >&2; exit 1; }
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
php artisan config:clear
php scripts/deployment-preflight.php
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
# APP_KEY must already exist: deliberately never generate or rotate keys here.
