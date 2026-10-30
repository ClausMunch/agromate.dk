# Local integration evidence

2026-10-29/30 implementation; no production access, provisioning or deployment. Initial HEAD `945e044`, initially clean. PHP and Composer are run inside Docker; browser tooling installed only under `/tmp/agromate-browser` with npm cache and browser downloads also in `/tmp`.

## Browser regression, red before integration

`AGROMATE_URL=http://127.0.0.1:8099 PLAYWRIGHT_BROWSERS_PATH=/tmp/agromate-playwright PLAYWRIGHT_MODULE=/tmp/agromate-browser/node_modules/playwright/index.mjs node scripts/browser-smoke.mjs`

Against the original static game, **failed as expected**: `Account/cloud controls exist`, false vs true. Existing local create, rename, title return and reload assertions had passed before this failure. Initial attempt against 8088 was connection-refused while the PHP harness was still building; this is setup evidence, not a behavior test.

Temporary browser installation:

```
npm install --cache /tmp/agromate-npm-cache --prefix /tmp/agromate-browser playwright
PLAYWRIGHT_BROWSERS_PATH=/tmp/agromate-playwright /tmp/agromate-browser/node_modules/.bin/playwright install chromium
```

First npm attempt used its default read-only home cache and failed; retry explicitly used `/tmp`. No host tools or permissions were widened.

## Real HTTP and browser green

`python3 scripts/http-smoke.py`: passed against Docker PHP http://127.0.0.1:8088 and isolated MySQL. Checks raw `/` game metadata, a JavaScript asset, guest session, HttpOnly/SameSite=Lax cookies, API no-store, unauthenticated private read, real missing-CSRF rejection, valid-CSRF guest rejection, unavailable OAuth login/callback (503) and public leaderboard response shape. Local harness intentionally uses HTTP with Secure=false; backend tests separately check production secure-cookie defaults.

`PLAYWRIGHT_BROWSERS_PATH=/tmp/agromate-playwright PLAYWRIGHT_MODULE=/tmp/agromate-browser/node_modules/playwright/index.mjs node scripts/browser-smoke.mjs`: passed local create/rename/title/reload, raw metadata and new controls, zero page errors.

Authenticated browser fixtures were created only through CLI, with explicit local/test-database guards; no test login HTTP route exists:

```
DOCKER_CONFIG=/tmp/agromate-docker docker compose exec -T -e AGROMATE_BROWSER_FIXTURE=1 app php scripts/browser-fixture.php browser-fixture-a > /tmp/agromate-browser-session-a.json
DOCKER_CONFIG=/tmp/agromate-docker docker compose exec -T -e AGROMATE_BROWSER_FIXTURE=1 app php scripts/browser-fixture.php browser-fixture-b > /tmp/agromate-browser-session-b.json
PLAYWRIGHT_BROWSERS_PATH=/tmp/agromate-playwright PLAYWRIGHT_MODULE=/tmp/agromate-browser/node_modules/playwright/index.mjs node scripts/browser-accounts.mjs
```

Passed real HTTP/MySQL browser flow: first sign-in leaves guest farm active; explicitly replace cloud; rename saves after debounce; guest localStorage retains original farm; public alias opt-in appears on scoreboard without private name/provider/email; separate HTTP writer advances revision and browser save detects conflict; explicit Load cloud chooses server state; account B replaces A's cookie and focus refresh restores guest, purges A's tab draft; logout retains guest; 390px viewport has no horizontal overflow; zero page errors.

`TEST_RESET_ONLY=1` before fix failed: expected `Private Cloud A`, actual empty string after cloud reset. After fix the same command passed, preserving a backend-valid chosen name. Initial fixture attempt was invalidated by concurrent MySQL test refresh; regenerated after suite completed. A UI test click was adapted to intentional dialog close behavior before continuing. These setup/automation failures are not hidden product passes.

Screenshots produced by real Chromium: `/tmp/agromate-account-desktop.png`, `/tmp/agromate-scoreboard-desktop.png`, `/tmp/agromate-account-mobile.png`. Desktop account screenshot visually inspected. Live Google consent/token exchange was not exercised because no real OAuth credentials were accessed or provisioned; provider behavior/state and subject identity are covered by backend tests.

## Final verification

- `sh scripts/backend-test.sh sqlite`: parent rerun **18 tests / 125 assertions / 1 intentional MySQL-only skip**.
- `sh scripts/backend-test.sh mysql`: backend worker final run **18 tests / 133 assertions / no skips**, including real simultaneous two-process create/update races.
- `node --test tests/frontend/*.test.cjs`: parent rerun **21 tests passed / 0 failures**.
- `python3 scripts/http-smoke.py`: **13 HTTP assertions passed** (output label corrected from an earlier grouping count of 12; assertions unchanged).
- Authenticated browser full flow rerun after final frontend privacy cleanup passed; desktop account, scoreboard, and 390px signed-in account screenshots visually inspected. Dialog content scrolls on mobile; no horizontal overflow. Additional screenshot `/tmp/agromate-account-mobile-signedin.png`.
- `node scripts/stamp-version.mjs`: **v0.6.0, build 6627b029, source 945e044, modified=true**. Existing version-number flow preserved.
- After stamp, `python3 scripts/check-seo.py`, `git diff --check`, HTTP smoke and `node scripts/browser-smoke.mjs` (Playwright env as above) passed.
- Composer strict validation, security audit, route/view caching and secure deployment-preflight evidence are in `docs/backend-evidence.md`.

Local preview remains http://127.0.0.1:8088; stop disposable services with `DOCKER_CONFIG=/tmp/agromate-docker docker compose down` (database is tmpfs). Dependencies are installed under ignored `vendor/`; `composer.lock` makes installation reproducible. Screenshots/session fixtures are temporary artifacts in `/tmp`, not production data. No commit, push, deployment, production database connection, or real Google OAuth exchange was performed.
