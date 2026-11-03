# In-game confirmation dialogs

Locally verified 2026-11-03. Replaces every native browser confirmation in public game code:

- Permanent upgrades: watering can, sprinkler, whole-field irrigation, stable, plow and jam maker.
- Load cloud farm, replace cloud farm and return to the local farm.
- Delete account and reset the current farm.

The shared dialog uses parchment, timber edging, green purchase buttons and muted brick destructive actions. Purchases name the improvement and display price and remaining gold. Destructive actions explain permanence and guest-farm handling.

Cancel receives initial focus. Escape, close, backdrop and Cancel all resolve without action; clicking inside does not dismiss. Focus returns to the original control. The confirmation sits above its originating dialog, preserves that dialog on cancellation and pauses gameplay. Screen readers receive a title and description. Rapid duplicate requests do not open multiple dialogs or duplicate purchases. Closing the originating dialog cancels its pending confirmation.

Purchases capture the current farm identity before waiting; cloud/account actions capture account identity, sync epoch and mode. Changes while the dialog is open prevent the original action from applying to the new context. Server-side revisions, validation and account checks remain in force.

Executed checks:

- All five frontend test files pass via `node --test tests/frontend/*.test.cjs`.
- `scripts/browser-confirmations.mjs` passes at 1440px and 390px. Covers all upgrade purchases, cancellation without mutation, Escape/backdrop/Enter/focus, duplicate activation, farm replacement while confirming, all five cloud/account prompts, account-switch fencing and explicit deletion/reset. Account APIs in this runner are mocked: no real account is deleted. No native prompts, runtime errors or horizontal overflow occur.
- `scripts/browser-farm-life-cloud.mjs` passes against the real isolated local Compose server. Cloud replace/load confirmations, activity autosave, server-state comparison, reload and guest isolation pass.
- The existing `scripts/browser-progression.mjs` mobile/touch flow passes with explicit in-game approval/cancellation, tool purchases, watering, horse controls, processing, sales and reload.
- Public source scan finds no native `confirm`, `alert` or `prompt` calls. SEO, JavaScript syntax and `git diff --check` pass.

Browser checks use the existing Playwright installation selected with `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_BROWSERS_PATH`. The cloud runner uses the restricted CLI-only fixture; session data stays outside the repository. The progression runner uses its established scratch `TMPDIR`.

Purchase and deletion screenshots at `/tmp/agromate-confirm-{purchase,delete}-{1440,390}.png` were inspected. Existing account, farm-life and save-guard browser runners were updated to approve in-game confirmations rather than native browser dialogs.
