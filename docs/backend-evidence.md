# Backend verification evidence

Local execution on 2026-10-29/30; no production deployment, push or commit. Tests use installed, locked Laravel 13.39.0, Socialite 5.31.0 and PHPUnit 12.5.42 with PHP 8.4.27. Package compatibility checked against Packagist metadata; Socialite declares Illuminate ^13 compatibility and Laravel requires PHP ^8.3. Reference: https://laravel.com/framework/docs and https://laravel.com/framework/docs/13.x/socialite.

## Harness and actual installation

```
mkdir -p /tmp/agromate-docker
DOCKER_CONFIG=/tmp/agromate-docker docker compose build app
DOCKER_CONFIG=/tmp/agromate-docker docker compose run --rm --no-deps app composer install --no-interaction --prefer-dist
DOCKER_CONFIG=/tmp/agromate-docker docker compose up -d mysql
DOCKER_CONFIG=/tmp/agromate-docker docker compose run --rm app php artisan migrate --force
DOCKER_CONFIG=/tmp/agromate-docker docker compose up -d app
```

The initial Docker build could not write builder activity under the read-only host Docker directory. Setting `DOCKER_CONFIG` to the empty temporary directory solved that without copying credentials. The image built successfully; Composer installed 106 packages and generated `composer.lock`. MySQL 8.4 runs on an isolated Compose network with tmpfs data, no database host port, and explicit disposable credentials. HTTP binds `127.0.0.1:8088`.

## Test-first history

Initial endpoint/auth/save/profile tests were written before implementing the application. The first actual suite command was:

```
DOCKER_CONFIG=/tmp/agromate-docker docker compose run --rm --no-deps -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: app vendor/bin/phpunit
```

It ran **12 tests, 4 assertions, 8 errors, 4 failures**: routes were absent and `User` was absent. The session/root slice then passed **2 tests, 9 assertions** with `--filter SessionTest`. The first save run exposed a test environment issue: Compose's `APP_ENV=local` prevented Laravel's usual unit-test CSRF bypass, returning 419. Explicit `APP_ENV=testing`, array cache/session and SQLite made the save slice pass **4 tests, 33 assertions**. The final PHPUnit configuration forces the testing server environment, and the harness test script also supplies it explicitly.

The subsequent auth/profile suite exposed missing in-memory model defaults and accidentally shared throttle buckets; after corrections it passed **12 tests, 77 assertions**. Those early behaviors used the bundled initial red suite rather than a separate isolated red run for every behavior, so this does not claim perfect per-behavior vertical TDD for the initial slices. Later refinements used isolated red → implementation → green runs:

| Filter | Observed red | Observed green |
| --- | --- | --- |
| `test_tiles_match_crop_structure` | 1 test, 1 assertion, failure: accepted invalid crop age | 1 test, 4 assertions |
| `HeadersTest` | 1 test, 3 assertions, failure: wildcard CORS present | 1 test, 3 assertions |
| `test_malformed_nested` | 1 test, 1 assertion, failure: malformed tiles caused 500 | 1 test, 6 assertions |
| `DeploymentPreflightTest` | 2 tests, 3 assertions, 2 failures: preflight absent | 2 tests, 35 assertions |

Each isolated command used:

```
DOCKER_CONFIG=/tmp/agromate-docker docker compose run --rm --no-deps -e APP_ENV=testing -e CACHE_STORE=array -e SESSION_DRIVER=array -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: app vendor/bin/phpunit --filter FILTER
```

Transient full output logs were recorded under `/tmp/agromate-*.log` during execution. This file retains counts and exact commands for review.

## Final suite and scope

```
sh scripts/backend-test.sh sqlite
sh scripts/backend-test.sh mysql
```

Final SQLite: **18 tests, 125 assertions, 1 intentional skip** (the MySQL-only concurrency test). Final MySQL: **18 tests, 133 assertions**, no skips.

Coverage includes guest/authenticated isolation, required current-account headers, unknown ownership input rejection, strict scalar and nested validation, 32 KiB request rejection, crop age/soil relationships, revision create/update conflicts, throttling, default opt-out, chosen alias privacy, account deletion, logout and CSRF rotation, invalid actual Socialite state, provider-subject identity independent of email, login session regeneration, real CSRF middleware with test bypass disabled, secure cookie flags, private cache headers and absent cross-origin CORS.

The MySQL concurrency test launches two independent PHP processes through a shared start barrier for revision 0, then repeats at revision 1. Each pair executes the real save controller and MySQL transaction, gets exactly one 200 and one 409, and leaves exactly one revision increment. It tests DB locking directly; separate parent HTTP/browser verification exercises middleware and cookies.

Preflight tests launch PHP subprocesses without database access for a valid production-shaped configuration and each of 11 unsafe settings. A direct local harness invocation:

```
DOCKER_CONFIG=/tmp/agromate-docker docker compose run --rm --no-deps app php scripts/deployment-preflight.php
```

returned exit 1 and `Preflight rejected configuration: APP_ENV, APP_URL HTTPS, SESSION_SECURE_COOKIE. No migrations were run.` The deployment script itself was not run against production.

## Additional actual checks

```
DOCKER_CONFIG=/tmp/agromate-docker docker compose run --rm --no-deps app composer validate --strict
DOCKER_CONFIG=/tmp/agromate-docker docker compose run --rm --no-deps app composer audit
DOCKER_CONFIG=/tmp/agromate-docker docker compose run --rm --no-deps app php artisan route:cache
DOCKER_CONFIG=/tmp/agromate-docker docker compose run --rm --no-deps app php artisan view:cache
DOCKER_CONFIG=/tmp/agromate-docker docker compose run --rm --no-deps app php artisan route:clear
```

Composer validation: valid. Audit: no security vulnerability advisories found. Route and view caches generated successfully; route cache cleared afterward for continuing development. Direct HTTP `/api/session` returned 200, JSON, no-store/private and HttpOnly SameSite=Lax session cookie; local harness deliberately disables Secure for loopback HTTP. Production Secure default is tested separately.

Full real Google provider consent/token exchange remains unexercised because no owner OAuth credentials were requested or accessed. Production database/OAuth provisioning and deployment await the owner. The parent records frontend, SEO, asset HTTP and browser evidence separately.
