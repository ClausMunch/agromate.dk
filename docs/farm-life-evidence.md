# Farm life · v0.7.0

Locally verified 2026-11-02. Adds named hens and eggs, timed fishing, 28-day seasons and weather, a seasonal bed, customer shop sales, digging and Kris’s cache, twelve decoration plots, and horse friendship/blankets. The existing 28-plot garden, seated rider and whole-field irrigation remain available.

## Saves

Existing v1/v2 local farms acquire independent activity defaults. Cloud saves accept earlier v2 farms without activities; after a slot contains activity data, an older client cannot erase it. Nested types, keys, collection limits, ownership, daily action dates, shop capacity, bed growth and blanket unlocks are validated. Reloading forfeits an unfinished fishing attempt while retaining its energy/attempt cost. Customer sales and egg production happen on sleep.

## Executed checks

- `node --test tests/frontend/*.test.cjs`: all five frontend files pass, including activity loops, migration, failed-action atomicity, rare catches and decoration footprints that leave both paths clear.
- `ddev exec vendor/bin/phpunit`: 28 tests, 240 assertions, one MySQL-specific skip.
- `ddev exec env DB_CONNECTION=mysql DB_DATABASE=agromate_test vendor/bin/phpunit`: 28 tests, 248 assertions, all pass. Uses a separate test database created and granted to the local DDEV database user; never point RefreshDatabase tests at the development `db` database.
- `scripts/browser-farm-life.mjs`: desktop 1440px and mobile 390px pass. Covers old-save defaults, coop/names/feed/eggs, real fishing timing and cancellation, seasonal planting/watering/harvest, map/clue/cache, customer sales, horse care/blankets, four decorations/removal, full reload and all seasons/weather. No runtime exceptions or horizontal overflow.
- `scripts/browser-farm-life-cloud.mjs`: authenticated coop/name/feed/egg autosave, server-state comparison, explicit cloud reload and guest isolation pass against the isolated Compose server on port 8088. Uses the CLI-only local fixture from `scripts/browser-fixture.php`; its session file stays outside the repository.
- `scripts/browser-progression.mjs`: existing desktop/keyboard and mobile/touch progression flows pass. The mobile runner now scrolls the movement pad into view before dispatching a real touch gesture after using the horse controls.
- `python3 scripts/http-smoke.py`: 13 HTTP assertions pass for metadata/assets, sessions/cookies, authentication, CSRF, fail-closed OAuth and scoreboard.
- `python3 scripts/check-seo.py`, the representative `scripts/simulate-progression.cjs` balance simulation, JavaScript/PHP syntax checks and `git diff --check` pass.

The browser runners use the existing Playwright module and browser cache selected by `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_BROWSERS_PATH`. The progression runner also requires the existing authorized scratch `TMPDIR`. The cloud runner reads `SESSION_FIXTURE` (default `/tmp/agromate-life-session.json`), generated using the isolated Compose app’s `browser-fixture-a` account.

Screenshots at `/tmp/agromate-life-{farm,decor}-{1440,390}.png` and `/tmp/agromate-life-season-{4,29,57,88}-{1440,390}.png` were generated. Desktop/mobile farm and decoration views and seasonal presentation were inspected. Decoration coordinates were adjusted after review to leave the south path clear.

## Release state

`VERSION` is 0.7.0; the generated public badge identifies build `5fc4b786`. After verification, the release was committed as `a31a9f1` and the badge was refreshed to reference that committed source without the modified marker. README, About and the factual game summary describe the activities. Production deployment and real Google consent were not exercised. Prices/rewards are initial balance defaults; the progression simulation covers one representative strategy, not every play style.
