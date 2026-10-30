#!/bin/sh
# Integrated, isolated verification. Requires the existing local Docker/Playwright harness.
set -eu
export TMPDIR=${TMPDIR:-/home/munch/.hermes/cache/scratch}
case "$TMPDIR" in /home/munch/.hermes/cache/scratch*) ;; *) echo 'Use the authorized scratch TMPDIR' >&2; exit 2;; esac
export DOCKER_CONFIG=${DOCKER_CONFIG:-$TMPDIR/agromate/docker-config}
export PLAYWRIGHT_MODULE=${PLAYWRIGHT_MODULE:-$TMPDIR/agromate/browser/node_modules/playwright/index.mjs}
export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-$TMPDIR/agromate/browsers}
artifacts=$TMPDIR/agromate-repair
mkdir -p "$artifacts"
run() {
 name=$1; shift
 printf '%s %s\n' "$(date -Iseconds)" "$*" > "$artifacts/$name.log"
 if "$@" >> "$artifacts/$name.log" 2>&1; then
  printf 'PASS %s\n' "$name"
  tail -10 "$artifacts/$name.log"
 else
  status=$?;tail -50 "$artifacts/$name.log";exit "$status"
 fi
}
run frontend node --test tests/frontend/cloud-sync.test.cjs tests/frontend/drafts.test.cjs tests/frontend/game-flow.test.cjs tests/frontend/progression.test.cjs
run backend-mysql sh scripts/backend-test.sh mysql
run backend-sqlite sh scripts/backend-test.sh sqlite
run php-lint docker compose run --rm --no-deps app php -l app/Http/Controllers/SaveController.php
for file in public/game.js public/progression.js public/cloud-sync.js public/cloud-ui.js scripts/browser-progression.mjs scripts/browser-accounts.mjs scripts/browser-save-guards.mjs scripts/simulate-progression.cjs; do node --check "$file"; done
run balance node scripts/simulate-progression.cjs
run seo python3 scripts/check-seo.py
run harness docker compose up -d app
run migrate docker compose exec -T app php artisan migrate --force
# Ephemeral local fixture cookies are kept out of command logs and repository files.
umask 077
docker compose exec -T -e AGROMATE_BROWSER_FIXTURE=1 app php scripts/browser-fixture.php browser-fixture-a > "$artifacts/session-a.json"
docker compose exec -T -e AGROMATE_BROWSER_FIXTURE=1 app php scripts/browser-fixture.php browser-fixture-b > "$artifacts/session-b.json"
run http python3 scripts/http-smoke.py
run browser-smoke node scripts/browser-smoke.mjs
run browser-desktop node scripts/browser-progression.mjs
run browser-mobile env MOBILE=1 node scripts/browser-progression.mjs
run browser-accounts node scripts/browser-accounts.mjs
# Logout invalidates the first fixture; issue a new isolated local session for guard tests.
docker compose exec -T -e AGROMATE_BROWSER_FIXTURE=1 app php scripts/browser-fixture.php browser-fixture-a > "$artifacts/session-a.json"
run browser-save-guards node scripts/browser-save-guards.mjs
run diff-check git diff --check
printf 'All progression checks passed. Artifacts: %s\n' "$artifacts"
