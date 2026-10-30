# Gameplay progression repair — durable checkpoint

Local implementation, parent-run integrated verification and independent final re-review completed on 2026-10-30, Europe/Copenhagen. This supersedes the rejected initial implementation report. The full-scope review identified one watering preview/action mismatch; a fresh fix context reproduced it RED, repaired it, and the independent bounded re-review approved the delta with no remaining security or logic findings. Final parent verification is recorded below.

No reset, clean, stash, commit, push, production access, deployment, credential provisioning or external messaging was performed. The parent orchestrated bounded implementation, repair and independent review contexts; implementation workers did not delegate further. Existing unrelated Laravel/social/cloud/scoreboard work remains in the shared working tree. PHP ran only in Docker against the disposable `agromate_test` MySQL database. Browser session cookies are local fixtures, not OAuth credentials. No dependencies were added or changed, so no dependency-install/audit step was needed.

## Review findings repaired

1. Removed the assignment that overwrote `orders()`. The actual Order board button opens delivery controls. Delivery consumes exactly the fixed request, pays money/earned once, and rejects invalid/negative needs. Basket sales retain automatically reserved raw crops and explain why. Order attributes are escaped; each delivery and upgrade button has a descriptive accessible label.
2. `AgromateProgression.migrate()` is the common pure migration boundary for local startup, farm replacement, cloud load/import and private-draft recovery. All three reservation fields survive. Fresh/reset/null replacements have three offers. Existing incomplete v2 defaults get horse coordinates/reservation defaults. Future versions fail before replacing current state or clearing pending work. Unsupported local data blocks Play/save, including after returning from cloud; explicit reset is available. Future private drafts are preserved with an update message.
3. Laravel validates exact JSON v1 types, keys and containers **before** migration, then validates migrated v2 data. Malformed produce cannot reach `array_replace`. V2 requires bounded exact horse/upgrades/reservations/processor shapes, unique known order identities and matching crop/quantity/reward/completion, no arbitrary dailyActions, consistent ownership/plow/feed and processor phases. A v1 request at the correct revision cannot overwrite a v2 slot (`409 client_upgrade_required`). Existing owner locks, revision conflicts, account fences and public privacy remain.
4. Three fixed deterministic offer slots retain unique identities. Completed slots persist until sleep, then reopen the same known offer next day; incomplete offers never expire. Reload does not reroll the board.
5. Copper can targets self/right/below without row wrapping. Only valid dry crops are previewed/charged. Base watering costs 2 energy per crop; copper costs 1 per newly watered crop. Insufficient batch energy causes no mutation. Canvas outlines and a textual preview agree with the action.
6. Plow requires mounted owned horse and bought equipment, valid nearby garden coordinates, suitable crop-free soil and sufficient energy. Rows never wrap. No off-garden fallback to tile zero. Successful batch costs 2 energy; one carrot lowers it to 1 until sleep. Feed is once per game day, consumes one carrot and survives reload without stacking.
7. Original Canvas stable and horse art, visible mounted rider/plow, persisted horse name/position, 140 vs 100 movement speed, existing map collision, adjacent clear-ground dismount or atomic failure. M/F/P plus ordinary focusable pointer/touch buttons below the farm. Name text including `Fern <3` round-trips safely. Sleep leaves the horse at the last riding position.
8. Permanent purchases show native confirmation, owned state, effect and price. Sprinkler installs at the west garden marker; six cyan outlined plots and adjacent text show coverage/timing. It waters crops at dawn **after** growth for the following night. Loading/rendering has no day effects.
9. Rebuilt `public/progression.js` from behavioral tests after replacing the initial untested module with an empty API. Added new backend progression regression tests; existing v1 fixtures still exercise legacy reads, while update/race fixtures now write v2 to respect the downgrade fence.
10. Real Chromium desktop/keyboard and 390×844 mobile/touch flows, authenticated cloud/account-isolation flow, future-save guards, deterministic balance simulation and canonical checks all ran. Mobile hit-testing caught action buttons covering garden plots; buttons now sit below the canvas. Actual CDP touch start/end exercises mounted directional-pad movement.

Garden expansion is explicitly deferred. The existing 28 tiles and crops are retained. Live Google consent and production provisioning remain outside this repair.

## Actual TDD trail

Full command output, timestamps and expected RED/GREEN outcomes:
`/home/munch/.hermes/cache/scratch/agromate-repair/tdd.log`.

`sh scripts/tdd-progression.sh red|green <command>` saves the actual transcript and fails on an unexpected outcome. Behavioral RED→minimal GREEN slices covered fresh state, migration, delivery, day refresh, purchases, watering, sprinkler, mount/dismount, mounted plow/feed and jam. Later slices cover replacement migration/future rejection, strict legacy validation, authenticated v2 round-trip/downgrade, known orders, equipment/processor consistency, cloud future-version atomicity, purchase confirmation, watering preview, visible workhorse controls, incomplete v2 defaults, mobile garden hit-testing, future guest protection after cloud, safe horse-name editing and keyboard/pointer watering-preview handoff.

The log retains an early browser infrastructure failure (missing default browser path), followed by use of the already installed scratch browser. It was not counted as a behavioral RED. Regression cases added after established behaviors are ordinary regression coverage, not retroactively claimed TDD.

## Final integrated results

Command:

```sh
TMPDIR=/home/munch/.hermes/cache/scratch sh scripts/verify-progression.sh
```

Final successful transcript: `/home/munch/.hermes/cache/scratch/agromate-repair/integrated.log`, ending 2026-10-30T05:27:34+01:00 with `All progression checks passed`.

| Check | Actual result |
| --- | --- |
| Frontend Node suite | 35 tests, 35 passed, 0 failed |
| `sh scripts/backend-test.sh mysql` | 24 tests, 192 assertions, no skips |
| Additional SQLite suite | 24 tests, 184 assertions, 1 intentional real-MySQL concurrency skip |
| PHP lint in Docker; relevant JS/MJS syntax | Passed |
| `python3 scripts/check-seo.py` | Passed raw metadata, image, structured data, links, robots, sitemap, factual summary and contact checks |
| `python3 scripts/http-smoke.py` | 13 real HTTP assertions passed |
| Existing browser smoke | Passed |
| New desktop progression | Passed |
| New narrow touch progression | Passed |
| Authenticated v2/cloud/account flow | Passed |
| Future local/cloud/draft and attribute guards | Passed |
| `git diff --check` | Passed |

Frontend command uses the same four files matched by `node --test tests/frontend/*.test.cjs`; that exact canonical glob was also run after documentation updates. Logs are in the same scratch artifact directory.

`browser-progression.mjs` starts from a legacy v1 fixture with 10000g, existing produce and three planted crops so late features can be exercised. After that initial fixture, delivery, confirmation cancel/accept, watering, horse naming/mounting/travel/feeding/plowing, jam start, pending-job reload, sleep, collection, sale and final reload use actual controls. It checks income, persistent state, safe reservations, 1.4× movement, mounted farmhouse collision, keyboard/pointer preview handoff, native keyboard button activation, no horizontal overflow and zero page errors. The mobile run additionally taps controls and drives the actual touch pad; hit-testing asserts that the right-hand garden tile reaches the canvas. Domain tests cover blocked dismounts, row edges, crop protection and insufficient energy.

`browser-accounts.mjs` uses locally issued authenticated sessions against the real Laravel API and MySQL. It imports v2 horse/upgrades state, delivers and processes jam, waits for real autosave, reloads the cloud slot, verifies guest storage stays separate, exercises concurrent stale-revision conflict/explicit load, public alias-only output, account switching/draft purge and logout. `browser-save-guards.mjs` uses an intentionally injected **future cloud response** for forward-compatibility rejection; that adversarial response is a browser route fixture, not a claim that the real server accepts unsupported data. Future draft and local fixtures are browser storage data. The authenticated happy path is real HTTP, not mocked.

Artifacts (all under the authorized scratch TMPDIR):

- `integrated.log`, `frontend.log`, `backend-mysql.log`, `backend-sqlite.log`, `php-lint.log`, `seo.log`, `http.log`, `balance.log`, `stamp-version.log`.
- `browser-desktop.log`, `browser-mobile.log`, `browser-accounts.log`, `browser-save-guards.log`, `browser-smoke.log`.
- `progression-desktop.png`, `progression-mobile.png`, `account-desktop.png`, `account-mobile-signedin.png`, `scoreboard-desktop.png`, `account-mobile.png`.
- `session-a.json`, `session-b.json`: ephemeral local test sessions; do not publish these as evidence.

Final public fingerprint is `66c76a90`, recorded in `stamp-version.log` and `public/version.js`. No release/version number bump or deployment was performed.

## Balance evidence

`node scripts/simulate-progression.cjs` uses a deterministic 28-plot parsnip strategy, actual 100-energy daily limits, 2-energy till/plant/harvest, tested watering actions, seed packs of five, the existing 50g quest gift, reservations and explicit delivery. It grants no fixture progression income. It keeps seed capital and buys can→stable→plow→jam maker→sprinkler. Actual result:

| Target | Game day | Crops harvested | Harvest days | Deliveries |
| --- | --- | --- | --- | --- |
| Copper can, 350g | 3 | 16 | 1 | 1 |
| Stable/horse, 2500g | 9 | 100 | 7 | 7 |
| Plow, 750g | 11 | 128 | 9 | 9 |
| Jam maker, 900g | 13 | 156 | 11 | 11 |
| Sprinkler, 600g | 15 | 180 | 13 | 13 |

Staggered planting produces harvest days rather than synchronized full-field cycles. Provisional prices are retained based on this representative path. This is not a universal balance claim; browser fixtures intentionally use an advanced farm and do not establish early-game pacing.

## Implementation-worker handoff (historical, superseded below)

At 05:28 the worker handed implementation and local verification back for independent final review. The parent subsequently inspected the repair, resolved the one remaining watering finding through a fresh fix context, consumed the independent approval and reran the full integrated harness. Expansion, real Google consent, production configuration and deployment remain outside completed scope. The local Docker harness is left running; its MySQL data is disposable.

## Narrow final-review repair evidence

On 2026-10-30 at 05:33 Europe/Copenhagen, the confirmed review blocker was reproduced with an integrated actual-game `useTile` regression in `tests/frontend/game-flow.test.cjs`: tile 0 was untilled, tile 1 held a dry carrot, and the copper watering-can upgrade was active. `P.waterTargets(state, 0)` returned `[1]`, but execution rejected tile 0 before calling `P.water`.

True RED command and result:

```text
TMPDIR=/home/munch/.hermes/cache/scratch sh scripts/tdd-progression.sh red node --test tests/frontend/game-flow.test.cjs
1..7
# tests 7
# pass 6
# fail 1
# exit 0 from the RED wrapper (expected test failure)
```

Minimal GREEN change: removed only the obsolete `useTile` anchor `tilled` check for watering; execution continues to call `P.water(state, i)`, the same target helper used by the preview. The integrated test also checks that an upgraded two-crop batch with one energy makes no mutation.

GREEN command and result:

```text
TMPDIR=/home/munch/.hermes/cache/scratch sh scripts/tdd-progression.sh green node --test tests/frontend/game-flow.test.cjs
1..8
# tests 8
# pass 8
# fail 0
```

Post-fix verification: the full frontend Node suite ran 37 tests with 37 passed and 0 failed; relevant JS/MJS syntax checks passed; the deterministic balance simulation passed; and `TEST_STEP=water` browser progression passed on both desktop/keyboard and mobile/touch using the scratch Playwright environment. `node scripts/stamp-version.mjs` refreshed `public/version.js` to build `3e589678`. Logs are under `/home/munch/.hermes/cache/scratch/agromate-repair/` (`tdd.log`, `frontend-final.log`, `balance-final.log`, `browser-water-desktop-final.log`, `browser-water-mobile-final.log`, and `stamp-final.log`). This evidence records the repair only and does not claim that the parent’s independent final review passed.

## Parent final verification and approval

The parent reran `sh scripts/verify-progression.sh` after the last code change. The complete actual output is `/home/munch/.hermes/cache/scratch/agromate-repair/parent-final.log`, finishing **2026-10-30 05:34:11 CET**, exit 0:

- Node: **37 tests passed, 0 failed**. Parent also reran the exact canonical `node --test tests/frontend/*.test.cjs` after the final two handler regressions: **37 passed / 0 failed**, recorded in `parent-canonical-node.log`.
- Full isolated MySQL: **24 tests / 192 assertions**, no skips; SQLite: **24 tests / 184 assertions / 1 intentional MySQL-only skip**.
- Real HTTP: **13 assertions passed**; SEO, PHP lint in Docker, relevant JavaScript syntax and whitespace checks passed.
- Full guest desktop/keyboard and narrow mobile/touch gameplay, authenticated progression autosave/reload, revision conflict, account switch/logout privacy, and future local/cloud/private-draft guards all passed with zero page errors.
- Deterministic balance simulation reproduced first watering-can purchase on day 3 and stable/horse on day 9. This is one strategy, not a universal balance guarantee.
- Parent visually inspected the actual desktop and mobile screenshots: horse controls are below the canvas, garden plots remain tappable, and the stable/horse and sprinkler use the existing pixel palette.
- Static scan of tracked additions plus **51 untracked source files** found no matches for the configured secret, shell-injection, dynamic-execution, unsafe-deserialization or SQL-interpolation patterns. This supplements, not replaces, review.

Independent full-scope review: `/home/munch/.hermes/cache/scratch/agromate-final-review.json` (no security findings, one confirmed watering issue). After the test-first fix, the independent re-review `/home/munch/.hermes/cache/scratch/agromate-final-rereview.json` returned **passed=true**, no security concerns and no logic errors. Both completed results were consumed by the parent. The final public build is **`3e589678`**, release number still `0.6.0`.

The project map is refreshed through the read-only project-map agent and parent map-only write, reusing saved dark/orange style. All generated artifacts remain under the authorized scratch directory. Existing uncommitted work is retained; no commit, push, production access or deployment occurred. Garden expansion is explicitly deferred. Live Google consent and production provisioning remain unverified and owner-dependent.
