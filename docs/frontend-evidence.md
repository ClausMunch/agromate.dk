# Browser save implementation and test evidence

Work performed locally on 2026-10-30 (UTC). No production service was used.

## Contract and browser storage

`cloud-sync.js` owns the session epoch, account-bound HTTP requests, revision, serial write queue and explicit conflict resolution. All private save reads and mutations send `X-Account-ID`; mutations also send `X-CSRF-TOKEN`. Save responses must contain the matching `account_id`. A server `account_changed` response detaches private state and refreshes identity, rather than offering to overwrite another account.

A login never loads or uploads a farm. The account dialog offers explicit load, import, replacement, local play and retry controls. Existing cloud saves stop an ordinary first import. Replacement obtains the latest revision only after the player confirms replacement; simultaneous changes can still return a conflict. Conflicts freeze automatic writes until an explicit choice.

Guest saves retain the original `localStorage` key `agromate-save`. Cloud edits immediately write an account-bound private draft in **sessionStorage**, separately from the guest farm. Drafts remain per-tab and may survive reload; recovery is explicit after verifying the matching signed-in account. Sign-out, deletion, session/account mismatch and choosing local play purge the private draft. No cloud farm is shown before an explicit load/recovery. Storage failures are shown truthfully. Closing a tab can lose an unsynced private draft; unload saving is not relied on.

Cloud writes coalesce for three seconds, serialize requests, and use each successful response's revision for the next request. Normal game movement retains the existing periodic local save rather than writing per frame. Explicit network failure does not loop retries; it leaves a pending draft and a retry control. Cross-tab BroadcastChannel/storage events and focus/session checks detach switched-account state; server account binding protects the gap between a session check and a request.

The account dialog works from both title and game. Loading a cloud farm restores its chosen name on the title screen. Cloud reset retains the chosen name and starts fresh stats; guest reset clears the guest farm. The journal reports actual cloud status. The scoreboard uses textContent for aliases and labels itself casual and unverified. Profile participation is explicit opt-in.

## Vertical red → green runs

Commands were run with Node 22 and the built-in test runner; no npm frontend build/dependencies are required.

| Behavior | Red command/result before implementation | Green result after implementation |
| --- | --- | --- |
| First login leaves local farm alone | `node --test tests/frontend/cloud-sync.test.cjs`: missing module, 1 failing test | 1 passing |
| Explicit cloud load, stale account response, first import conflict | same command: 1 passing / 3 failing (`load`/`importLocal` absent) | 4 passing |
| Coalescing, returned revision serialization, conflict freeze, offline truth, switched-account write fencing | same command: 4 passing / 5 failing (`changed` absent) | 9 passing |
| Immediate logout isolation and captured identity, mismatched save envelope, stale session response | same command: 11 passing / 1 failing (`logout` absent) | 12 passing |
| Serialize explicit imports and discard import response after detach | same command: 12 passing / 1 failing (`busy` false) | 13 passing |
| Private per-tab drafts, account mismatch purge, guest key separation, blocked storage | `node --test tests/frontend/drafts.test.cjs`: missing module, 1 failing file | 2 passing |
| Server session changes between preflight and mutation | `node --test tests/frontend/cloud-sync.test.cjs`: 13 passing / 1 failing (mode remained cloud) | 14 passing after distinguishing `account_changed` from revision conflicts |
| Cloud reset valid name and guest reset/title selection | `node --test tests/frontend/game-flow.test.cjs`: 1 passing / 1 failing (empty cloud farmerName) | 2 passing |
| Clear old farmer names in transient tooltip/toast text | `node --test tests/frontend/game-flow.test.cjs`: 4 passing / 1 failing (previous private farmer name remained) | 5 passing after clearing transient names on replace/reset |
| Clear old private journal DOM on farm/account replacement | `node --test tests/frontend/game-flow.test.cjs`: 3 passing / 1 failing (previous account stats remained) | 4 passing after clearing modal content in replace/reset |
| Journal truthful cloud status | same game-flow command: 1 passing / 2 failing including journal's browser-persistence claim | 3 passing after reset and journal fixes |

Final frontend command: `node --test tests/frontend/*.test.cjs` — **21 tests passed, 0 failed**.

`node --check public/game.js`, `node --check public/cloud-sync.js`, `node --check public/cloud-ui.js` passed.

`python3 scripts/check-seo.py` passed after adding account controls; raw metadata, social image, canonical/discovery files and local links remain intact. Browser integration results and screenshots are recorded separately by the parent review, which exercised the real local Laravel/MySQL HTTP server.
