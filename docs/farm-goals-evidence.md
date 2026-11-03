# Continuing farm goals

Locally verified 2026-11-03. The introductory task now leads into seven goals: plant 5 seeds, harvest 5 crops, earn 250g, upgrade the watering can, build a coop/shop/stable, harvest 50 crops and earn 3,000g total.

Completed goals show a short confirmation for 2.5 seconds of active play. Dialogs, title screens and hidden tabs pause the countdown. The next unfinished goal then appears automatically; after the last goal the card disappears. Loading a farm skips goals already achieved. Replacing or resetting a farm resets the presentation to that farm's progress.

Goals derive from existing saved totals and permanent unlocks. Spending gold, selling inventory or sleeping cannot undo progress. There are no new save fields or rewards; the existing 50g planting gift is preserved. Existing local and cloud saves use the same schema.

Verification:

- `node --test tests/frontend/*.test.cjs`: all five frontend files pass. New domain tests cover the complete seven-step sequence, transient completion timing, old saves, fresh farm replacement and no state/reward mutation.
- `scripts/browser-farm-goals.mjs`: desktop 1440px and mobile/touch 390px pass. Real planting pays the original gift, briefly completes the card and advances to harvesting. Dialog pause, reload skipping, advanced saves, final completion via digging income, hidden-after-reload, and switching to a fresh farm pass. No runtime errors or horizontal overflow.
- `python3 scripts/check-seo.py`, JavaScript syntax and `git diff --check` pass.

Browser runs use the existing Playwright installation selected with `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_BROWSERS_PATH`, against local DDEV. Screenshots are `/tmp/agromate-goals-active-{1440,390}.png` and `/tmp/agromate-goals-finished-{1440,390}.png`; desktop/mobile layouts and the cleared final state were inspected.
