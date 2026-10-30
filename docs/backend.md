# Local backend and Ploi operations

This implementation is for local verification and review. It has not been deployed. Production Google credentials, database provisioning, and owner approval remain outstanding.

Laravel 13 requires PHP >=8.3. The reproducible harness uses PHP 8.4 with PDO MySQL/SQLite, mbstring, XML/DOM and zip. Composer resolves and locks the framework and Socialite; no frontend build is needed.

## DDEV development

For a persistent local Laravel environment at **https://agromate.ddev.site**, follow the [DDEV setup in the README](../README.md#local-development-with-ddev). It uses PHP 8.4, MySQL 8.4, and Nginx with `public/` as the document root. Start it with `ddev start`, run framework commands with `ddev artisan`, and run the isolated SQLite suite with `ddev composer test`.

The DDEV database is separate from the disposable Compose database below. DDEV preserves its data across stops and restarts. The `.env.example` retains production defaults; the first-time DDEV instructions configure a private local `.env` instead. Never overwrite an existing `.env` or regenerate its application key during routine starts.

## Disposable development

```
mkdir -p /tmp/agromate-docker
export DOCKER_CONFIG=/tmp/agromate-docker
export AGROMATE_UID=$(id -u) AGROMATE_GID=$(id -g)
docker compose build app
docker compose run --rm --no-deps app composer install --no-interaction
docker compose up -d mysql
docker compose run --rm app php artisan migrate --force
docker compose up -d app
```

Open http://127.0.0.1:8088. The harness contains only explicit development credentials and a disposable application key; never copy these into production. MySQL data lives in tmpfs and disappears when its container is removed. It has no host database port. `docker compose down` destroys this development database. The HTTP port binds only loopback. `DOCKER_CONFIG` avoids writing Docker builder metadata outside the allowed workspace; it does not copy existing Docker credentials.

Tests:

```
sh scripts/backend-test.sh sqlite
sh scripts/backend-test.sh mysql
```

The second command uses the isolated MySQL service. Tests never target production. Do not replace test environment values with production database credentials.

## API and privacy

All API routes use same-origin Laravel web sessions and CSRF. `/api/session` returns minimal account information, a CSRF token and login availability. Supply `X-CSRF-TOKEN` on mutations and `X-Account-ID` on private save reads and authenticated mutations. The account header must equal the current session's account; stale tabs receive `409 {"error":"account_changed"}`. The header cannot grant access to any other account.

`GET /api/save` returns `{account_id,save:null|{revision,state}}`. `PUT /api/save` accepts only `{revision,state}`. Creation requires revision 0; updates require the current revision. Every accepted write increments the revision. Stale revisions return `409 {"error":"revision_conflict"}` without changing the slot. A transaction locks the owning user row before reading the slot, serializing concurrent creation and updates. No arbitrary user ID or slot path is accepted.

Cloud state is schema version 2 with the game's exact nested keys, numeric bounds, 28 garden tiles and a 32 KiB request limit. Version 1 input is strictly validated before migration; server-generated defaults are then validated as v2. V2 includes bounded upgrades, named/positioned horse, known unique orders with consistent completion, three reservation counts, one consistent jam-production slot, empty dailyActions and lastNightDay. Unsupported future/scalar versions return 422. A v1 writer cannot replace an existing v2 slot even at its current revision (409 client_upgrade_required). Local/cloud/draft reads share the frontend migration boundary and reject future data before replacement. Score is derived from validated `earned`, never from a direct score endpoint. These are casual, unverified, client-authored scores, not ranked anti-cheat. Public output contains only the chosen public alias and score, and only after explicit opt-in. No email, provider identifier, OAuth access token or password is stored. Account deletion cascades its private slot and removes its public entry.

## Ploi installation

Use PHP 8.4 and MySQL 8.4 (or another tested supported MySQL), HTTPS, and a dedicated least-privilege database user. Configure the Ploi site document root to this repository's **public/** directory. Do not expose the repository root. Keep existing static assets in `public/`; Laravel `/` serves the existing `index.html` with its original metadata. Nginx must use `index index.php;` (so the preserved index.html cannot bypass Laravel at `/`) and `try_files $uri $uri/ /index.php?$query_string;` and deny hidden files except `.well-known`. Do not configure `index.html` as an alternate app entry for protected API URLs.

Copy `.env.example` to `.env` on the server and set database credentials and Google credentials securely through the owner's deployment environment. Never commit `.env`. `APP_ENV=production`, `APP_DEBUG=false`, HTTPS `APP_URL`, `SESSION_SECURE_COOKIE=true`, `SESSION_HTTP_ONLY=true`, `SESSION_SAME_SITE=lax`, database sessions and database cache are required production defaults. Keep `.env` owner-readable only and grant write access only to `storage/` and `bootstrap/cache/` for the PHP user.

Generate the application encryption key **once** on initial installation with `php artisan key:generate --force`; preserve it securely across releases and backups. Do not put key generation in the deployment script or rotate it on normal deployments.

Google Cloud OAuth application: configure Web application credentials and the exact authorized redirect URI **https://agromate.dk/auth/google/callback** (scheme, host and path must match `GOOGLE_REDIRECT_URI`). The local optional callback is `http://127.0.0.1:8088/auth/google/callback` and must be registered separately if used. Missing configuration makes login unavailable. The app intentionally uses Socialite's stateful session state validation; never add `stateless()`. Existing Google logins are identified only by provider and subject, never linked by email.

After environment configuration and backup, run the reviewed `sh scripts/deploy-backend.sh` as the site user. It installs locked production dependencies, clears stale config cache, then runs `scripts/deployment-preflight.php` before any migration. Preflight requires production mode, debug off, a valid existing encryption key, an HTTPS application URL, MySQL, database sessions/cache, encrypted secure HttpOnly SameSite=Lax sessions; it prints setting names only and makes no database connection. An unsafe setting stops deployment before migrations. The script then migrates forward and rebuilds framework caches. No npm build is necessary. Deploy static assets together with PHP code; stamp version before creating the release artifact. Test HTTPS `/`, an asset, `/api/session`, a full OAuth round trip, save conflicts and logout after deployment before announcing availability.

## Backup, retention and rollback

Back up MySQL consistently (including users, cloud saves and revision numbers), application key and secure environment configuration. Encrypt backups, restrict access and periodically verify restores into an isolated database. Session/cache data may be discarded on restore to force fresh logins. Account deletion removes active data immediately; document any operator backup retention period in the live privacy notice before launch. Do not claim expired backups have been erased until the operator has verified retention handling.

Rollback code to the previous release while retaining `APP_KEY` and database. These initial migrations are additive; avoid `migrate:rollback`, `migrate:fresh` or destructive down migrations in production. Future schema changes must preserve compatibility with the previous release or use a separately reviewed restore procedure. A database restore can lose newer saves; coordinate downtime and preserve a pre-restore backup.

No queue worker or cron job is needed for the current synchronous feature set. Laravel database-session garbage collection handles expired sessions probabilistically; production operators may choose an explicit maintenance policy later. Monitor errors, storage growth and login/save throttling without logging save payloads, auth callback codes or provider responses.
