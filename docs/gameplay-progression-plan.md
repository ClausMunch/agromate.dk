# Agromate: progression, orders, upgrades and a workhorse

## Authorization and execution boundary

Owner requested this plan and scheduled implementation after the next usage reset in Discord thread 1565314482534617199, message 1565515100809465897. Do not implement gameplay before the scheduled run. No production deploy, push, production database access, paid services or OAuth provisioning is authorized by this task. Preserve all current uncommitted Laravel/backend work. The backend was locally tested but live Google consent and production configuration are outstanding; do not present them as completed.

Live quota check 2026-10-30 00:58 Europe/Copenhagen: next five-hour primary reset 2026-10-30 04:46:13 +01:00; weekly window does not reset then. Schedule once at 04:50 +01:00 with a new quota check before implementation. Do not spend reset credits or change plans. This is implementation, not merely a reminder.

## Product goal

Make the existing plant → water → sleep → harvest → sell loop fund meaningful choices and visible improvements. Keep a relaxing, playable single-player game with guest/offline play. Borrow general progression principles, not Stardew artwork, characters, text, map layouts or code. Existing English UI remains English. Report to the owner in Danish.

Target loop: choose an optional order → allocate seeds/crops/energy → grow and harvest → choose immediate sale, delivery, food or processing → buy tools/stable → experience a visibly different working day.

## Scope and sequencing

Implement in vertical, tested milestones. Complete the integrated scope below, not just a specification or isolated demo. Tune starting balance through deterministic simulations and actual browser play; prices below are reversible starting hypotheses, not established balance facts.

### 1. Orders and a reason to save produce

- Add an accessible order board with at most three active offers and no expiry/failure punishment in this first version.
- Offer fixed, understandable requests using existing crops. Example initial request: 5 carrots for a reward modestly above their normal sale value.
- Complete only by explicitly delivering owned produce; atomically consume exactly the required quantity and pay exactly once. Selling crops does not also complete orders.
- Generate/persist the board deterministically from save state; no reload rerolls. Replace completed offers on the next game day, not indefinitely within one day.
- Show quantities, progress and rewards. Ensure the basket's sell-all behavior does not silently consume reserved crops: explain it and offer an explicit reserve/deliver interaction or an equally clear minimal solution.
- Count legitimate delivery income consistently in total earned and scoreboard without double-counting.

### 2. Useful tool upgrades and limited expansion

- Upgrade shop with owned/unowned state, visible price, effect and confirmation. Reject unaffordable or duplicate purchases without partial mutation.
- Watering-can upgrade waters up to three adjacent valid tiles in a predictable previewed pattern. Charge only for newly affected tiles and make it a real efficiency improvement. Respect crop/soil validity and avoid out-of-bounds wrapping.
- One sprinkler obtainable later: place it on a clear marked position and show its coverage. Water its bounded adjacent tiles at a documented point in the day cycle; no crop can grow twice in one night. Repeated rendering/loading must not reapply day effects.
- One modest garden expansion, only if integrated layout can remain readable on mobile. Expansion means adding real usable tiles and migrating existing 28-tile saves without losing crops. If expansion would make this run too large, explicitly defer it in evidence rather than claim completion; prioritize all other named milestones.
- Energy costs must remain nonnegative and understandable. Fractional energy, if used, must be supported in UI, saves and server validation; prefer integer costs or explicit batch costs to minimize complexity.

### 3. Stable, named workhorse and plow

- Make a stable + horse a substantial permanent purchase target. Starting tuning hypothesis: stable with horse about 2500g, separate plow about 750g; adjust after simulations if grind is excessive.
- Draw original pixel art consistent with the existing farm. Stable must not obstruct current house, shop, shipping box, paths, order board or tool interactions.
- Allow naming the horse with bounded, safe text. Persist ownership/name/equipment. No sickness, death or mandatory feeding punishment.
- Allow mounted travel with a noticeable speed improvement (starting hypothesis 1.4x) and accessible mount/dismount controls for keyboard, pointer and touch. Collision remains correct and character/horse appearance is readable. No teleporting or dismount into blocked terrain.
- Separate the mount's movement effect from work efficiency: ownership alone is not a magical permanent discount on every action.
- Bought/equipped plow enables a visible horse-assisted till action over a small row (up to 3 suitable tiles) for less total energy than individual tilling. Charge only when work succeeds. Do not destroy existing crops.
- Optional carrot feeding consumes exactly one carrot for a modest clearly described work bonus until sleep. No unlimited stacking/reload exploit; persist daily application and reset at sleep.
- Current map is compact, so work assistance is the primary benefit. Do not expand the world solely to justify riding.

### 4. A small processing layer

- One purchasable jam maker with one persisted production slot and strawberry-jam recipe. Display input, output, processing duration and sale value before starting.
- Explicitly consume existing strawberries, finish after a defined number of game-day transitions (initially one), collect exactly once, and sell resulting jam through a clear existing or extended basket flow.
- Persist pending/completed job; loading, sleeping or reconnecting must not duplicate items or rewards. No real-time background worker required.
- Raw crops remain usable for orders and immediate sale. Jam should improve margin while tying up produce and money; do not make every raw sale obviously wrong.

## Deliberate non-goals

Ranked anti-cheat, multiplayer, new social providers, complex NPC relationships, seasons that destroy crops, mandatory animal chores, a large new map, greenhouse restoration and additional processing recipes are future scope, not acceptance criteria for this run. The scoreboard remains explicitly casual/unverified. Avoid adding dependencies or a frontend build unless there is demonstrated need.

## Save and backend compatibility: mandatory

- Inspect current local save, private draft, cloud controller, exact-key/numeric validation and all tests BEFORE choosing the schema. Backend currently strictly validates 28 tiles and schema version 1; changing only game.js will break cloud saves.
- Introduce a documented versioned migration for all new progression fields. Upgrade existing guest/cloud farms by supplying safe defaults and preserving farmer, inventory, tiles, day and money. Maintain read support for old saves and validate migrated data server-side. Never mutate production data during development.
- If expansion is implemented, handle both old and new tile counts through migration and version-aware validation, and ensure older clients cannot destructively overwrite newer saves. Reject unsupported future versions with a clear update message.
- Include horse, upgrades, order board, reservations, processor state and new produce in bounded validation. Reject extra arbitrary keys, invalid counts, impossible enums and malformed arrays without 500s.
- Keep ownership isolation, revision conflicts, debounce, first-import explicit choices, logout/account-switch fences and private/guest separation intact.
- Derive earned income consistently for ordinary sale, order delivery and jam sale. Purchases are expenses, not score gains. Feeding/processing inputs are consumption, not income.

## Acceptance and verification

Follow TDD in vertical slices: an actual failing behavioral test, minimal implementation, green, then next slice. Record real commands/results, not fabricated history.

- Deterministic tests for order consume/pay-once, board persistence/day refresh, purchase insufficiency/duplicates, area targeting/energy, sprinkler timing, mount collision, safe dismount, plow crop protection, feed once/reset, processor consume/finish/collect-once, save migration and future-version rejection.
- Backend regression for old/new valid saves, malicious progression payloads, account isolation, revision races and unchanged public privacy. Run the full suites against isolated MySQL, not only SQLite.
- Browser guest flow: old save loads → order delivery → buy/use upgrade → buy/name/mount/workhorse → process/sell jam → reload retains state. Test keyboard and narrow touch viewport; no uncaught browser errors or lost controls.
- Browser authenticated fixture flow: save/reload progression, stale revision conflict, account switch/logout never leaks another player's farm. Real Google consent remains credential-dependent and must not be claimed.
- Run node --test tests/frontend/*.test.cjs; sh scripts/backend-test.sh mysql; python3 scripts/check-seo.py; python3 scripts/http-smoke.py; git diff --check; relevant PHP/JS lint and dependency audit if dependencies change. Read canonical commands first as they may evolve.
- Exercise balance with a deterministic representative early-game simulation; document how many harvest/delivery cycles lead to first upgrade and horse. Adjust provisional costs based on results. Do not claim universally balanced gameplay from a simulation alone.
- Independent security/correctness review must finish and blocking findings be resolved before declaring complete. Parent must run integrated tests, not just repeat worker reports.
- Refresh version fingerprint after final public changes; preserve release flow. Update README/help/about only where behavior changed, plus a concise implementation/evidence document and project map. No SEO factual contradictions.

## Scheduled-run workflow and handoff

1. Read ~/.codex/codex.md, project instructions, this plan, current Git status, and any completed backend review findings. There are extensive uncommitted backend files: do not reset/clean/stash them away or silently stage them as your own work.
2. Check live quota using the codex skill helper. Confirm scheduled reset has passed and usable quota is available. If reset moved or quota is unavailable, schedule a new one-shot after the actual next reset and report the delay; no busy polling or credit redemption.
3. Load test-driven-development, codex and requesting-code-review skills. Use the project-map custom agent with enforced map-only scoped permissions, or read-only output for parent write; reuse saved dark/orange style. Do not widen sandbox permissions.
4. Implement milestones in order, track durable checkpoints in docs/gameplay-progression-evidence.md so an interruption is recoverable. Use bounded delegation rather than multiple expensive redundant broad-context agents. Stay within available quota.
5. Actually run and inspect tests and browser checks. If using Codex via background CLI, consume the completed result and independently verify before cron exits; do not just launch a worker and send a completion message. If runtime constraints require continuation, explicitly create a follow-up job with durable checkpoint path and deliver an honest partial status.
6. Do not deploy, push, commit, change live database, access secrets or use paid services. Preserve other work. Final report in Danish to original Discord thread: implemented milestones, actual tests, screenshots if useful, remaining blockers, and clear not-deployed status.
