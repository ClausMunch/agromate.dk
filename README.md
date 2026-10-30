# Agromate

A small, original pixel-art farming game with optional Laravel + MySQL accounts and private cloud saves. The existing browser game needs no frontend build.

For guest-only static play, run `python3 -m http.server 8000 --directory public`. Account APIs require PHP/Laravel: follow [the backend setup and Ploi guide](docs/backend.md). The Docker harness installs the real locked dependencies and runs an isolated MySQL database; it never connects to production.

## Local development with DDEV

With Docker and DDEV installed, run these commands on first setup:

```sh
cp .env.example .env
ddev start
ddev composer install --no-interaction
ddev dotenv set .env --app-env=local --app-debug=true --app-url=https://agromate.ddev.site --google-redirect-uri=https://agromate.ddev.site/auth/google/callback
ddev artisan key:generate
ddev artisan config:clear
ddev artisan migrate
```

Open **https://agromate.ddev.site** (or run `ddev launch`). Subsequent sessions only need `ddev start`; use `ddev stop` to stop the containers. Generate the application key only on first setup, preserving an existing `.env` and key. No frontend build is needed.

DDEV uses PHP 8.4, Nginx, and a persistent MySQL 8.4 database with local credentials `db` / `db`, database `db`, host `db`. DDEV's Laravel integration sets these database values in `.env`. The custom Nginx configuration serves `/` through Laravel while keeping the game's static files available. This database is separate from the disposable Docker Compose test harness.

Run `ddev composer test` for the isolated SQLite test suite. Google login remains unavailable until you supply local OAuth credentials in `.env` and register `https://agromate.ddev.site/auth/google/callback` with Google. See the [DDEV Laravel quickstart](https://docs.ddev.com/en/stable/users/quickstart/#laravel) for DDEV usage.

## Playing

Move with WASD or arrow keys, or click a path. Select tools with 1–5. Click garden squares to till, plant, water, and harvest; Space uses your tool in front of the farmer. Click the seed packet (or press 2) to pop open the seed selector. Choose a crop to sow; the popup closes after selection and each button shows how many seeds you own. Click the seed packet again, click outside, or press Escape to dismiss it. Buy seeds at the seed shop, grow watered crops by ending the day, and sell harvested produce with the basket or shipping box. On touch screens, use the directional buttons and tap garden squares.

Parsnips take 2 watered days, carrots 3, strawberries 4. Sleeping restores energy. Progress is saved automatically to this browser using localStorage. The farm journal tracks your progress. Sound is optional.

Orders on the board reserve their required raw crops from sell-all. Deliver explicitly to earn the displayed reward once; completed offers return the following day. The tool shop confirms permanent purchases: copper can (350g), sprinkler (600g), stable with named horse (2500g), horse plow (750g) and jam maker (900g). The copper can previews self/right/below and charges 1 energy per newly watered crop. The sprinkler's cyan six-tile patch waters at dawn after growth, for the following night.

Mount beside your horse with **M**, feed one carrot with **F**, and use **P** while mounted in the garden to plow up to three clear tiles in your current row. Buttons below the farm support keyboard, pointer and touch. Riding is 1.4× faster. Plowing costs 2 energy, or 1 with today's nonstacking carrot bonus. Crops are protected; blocked dismounts and insufficient energy leave state unchanged. Jam consumes one strawberry, completes after one sleep, and must be collected in the shop before selling for 180g. Expansion is deferred; all 28 existing plots remain.

Save schema v2 preserves legacy v1 farms across local, private-draft and cloud loading. Future versions show an update message before replacing a farm. The server validates legacy input before migration and rejects v1 overwrites of existing v2 slots. See [progression evidence](docs/gameplay-progression-evidence.md) for exact tests and artifact paths. Run `TMPDIR=/home/munch/.hermes/cache/scratch sh scripts/verify-progression.sh` for the local integrated harness (Docker and the existing Playwright install required).

Artwork is drawn in code with Canvas, with original characters and scenery. The favicon is an original pixel-art sprout in the farm palette. Fonts use Google Fonts with system fallbacks. Guest play needs no account. Optional Google sign-in enables one private cloud slot; local and cloud choices are explicit.

The version label below the game shows the release number, a content fingerprint, and the source Git commit. “Modified” means the served files include uncommitted changes. Hover over it for the full commit. Before previewing or publishing updated files, run `node scripts/stamp-version.mjs` to refresh the label. Change `VERSION` when releasing a new version. The generated `public/version.js` ships with the static site, so the displayed version identifies that build rather than a separate live server response.

Ambient ducks fly in, land on the pond, paddle with ripples, and take off again. Small flocks occasionally cross the farm overhead. Wildlife pauses while dialogs are open or the tab is hidden; reduced-motion mode keeps the ducks resting on the pond and skips flights.

Start at the title screen, enter your farmer’s name, and press Play. Returning players can continue their saved farm and change their name. Click the Agromate logo to return to the title screen without resetting progress. Your farmer breathes and blinks while idle. A tabby cat strolls around the clearing, stalks and pounces on mice, then grooms before continuing its patrol. Title screens and dialogs pause play; reduced-motion mode keeps the cat still.

The farmer has front, back, left, and right views matching movement. After a short pause, the farmer turns toward the camera and starts breathing and blinking. The turn also updates the direction used by Space interactions. Reduced-motion mode skips the animated turn and breathing.

The fullscreen title features an original pixel-art landscape, drifting clouds, passing birds, and a wooden Agromate sign. Enter a name and Play, or Continue a saved farm. Use the explicit **Title screen** button in the game header (or the logo) to save and return to the menu. The title scene animates only while open and visible, and respects reduced-motion preferences.

Kris the seagull periodically flies in, lands beside the garden, and takes off again. Hover over Kris to see his name, or click/tap him to get “hey hey.” The seagull also supports keyboard focus and activation. Hovering over your farmer shows the name from your profile. Seagull visits pause with gameplay; reduced-motion mode keeps Kris resting on the farm.

The title landscape also hosts occasional duck flyovers and a tabby strolling across the foreground. With reduced motion enabled, flights are omitted and the cat rests in place.

## Sharing and discovery

The canonical public URL is **https://agromate.dk/**. Both game and About pages include static titles, descriptions, canonical links, Open Graph metadata, X large-image cards, and JSON-LD. The share image is `public/agromate-social-v1.png` (1200×630 PNG). Metadata is in the original HTML, so social crawlers do not need to run the game.

`public/about.html` provides human-readable game facts, controls, crop times, and save limitations. `public/robots.txt` permits crawling and points to `public/sitemap.xml`. `public/llms.txt` is an optional factual summary for tools that choose to read it; it is not a crawler policy or a guarantee of AI recommendations. The game description and structured data contain no invented ratings or reviews. The contact address remains obfuscated.

Run `python3 scripts/check-seo.py` to check raw metadata, linked files, structured data, the image, crawler access, and discovery files. Run `node scripts/stamp-version.mjs` before publishing; the fingerprint now covers all public files except its own generated version script.

The share-image source is `scripts/social-card.html`. To regenerate it, serve `public/` locally and run Chrome with a debugging port (9238 by default), then run `node scripts/render-social-card.mjs http://127.0.0.1:8000/`. Set `CHROME_DEBUG_URL` if the browser uses another port. The renderer uses the original title artwork and freezes the scene for a repeatable card. If changing the share image later, give it a new versioned filename and update both pages' social metadata and structured image URL so cached social previews can refresh.

For Laravel hosting, deploy the repository and locked production Composer dependencies, with the document root set to `public/`; follow [the Ploi guide](docs/backend.md). Preserve the PNG, About page, robots.txt, sitemap.xml, and llms.txt. The host must return the real files with correct MIME types, without login or crawler challenges. Then submit `https://agromate.dk/sitemap.xml` through the owner's Google Search Console and Bing Webmaster Tools accounts. No account ownership verification or sitemap submission is included here. Search ranking, indexing, and AI inclusion are determined by the services, not guaranteed by metadata.

Implementation follows [Open Graph](https://ogp.me/), [Schema.org VideoGame](https://schema.org/VideoGame), and [Google's guidance on AI search features](https://developers.google.com/search/docs/appearance/ai-features), which recommends normal crawlable SEO foundations rather than special AI markup.

## Accounts and privacy

Google login is unavailable until the owner configures OAuth. There are no account passwords and no stored Google tokens or email addresses. Accounts use the provider subject as identity. Choose a public alias separately; the casual scoreboard is off by default and publishes only aliases and earned-gold scores derived from validated saves. These client-supplied game statistics are unverified; this is not ranked or cheat-proof competition.

Cloud saving is optional. First choose to upload this device's farm or load the cloud farm. Revision conflicts stop automatic writes and require an explicit choice; first login never silently replaces either farm. Guest play and immediate device saving remain available offline. Cloud writes are debounced and do not depend on leaving the page. Account deletion removes its private save and scoreboard entry. Shared devices should sign out after playing.

Implementation and validation evidence is recorded in `docs/backend-evidence.md`, `docs/frontend-evidence.md`, and `docs/integration-evidence.md`. No production deployment or live OAuth provisioning is claimed.
