# Agromate

A small, original pixel-art farming game for the web. No dependencies or build step.

Run `python3 -m http.server 8000 --directory public` and visit http://localhost:8000.

Move with WASD or arrow keys, or click a path. Select tools with 1–5. Click garden squares to till, plant, water, and harvest; Space uses your tool in front of the farmer. Click the seed packet (or press 2) to pop open the seed selector. Choose a crop to sow; the popup closes after selection and each button shows how many seeds you own. Click the seed packet again, click outside, or press Escape to dismiss it. Buy seeds at the seed shop, grow watered crops by ending the day, and sell harvested produce with the basket or shipping box. On touch screens, use the directional buttons and tap garden squares.

Parsnips take 2 watered days, carrots 3, strawberries 4. Sleeping restores energy. Progress is saved automatically to this browser using localStorage. The farm journal tracks your progress. Sound is optional.

Artwork is drawn in code with Canvas, with original characters and scenery. The favicon is an original pixel-art sprout in the farm palette. Fonts use Google Fonts with system fallbacks. No accounts or server are needed.

The version label below the game shows the release number, a content fingerprint, and the source Git commit. “Modified” means the served files include uncommitted changes. Hover over it for the full commit. Before previewing or publishing updated files, run `node scripts/stamp-version.mjs` to refresh the label. Change `VERSION` when releasing a new version. The generated `public/version.js` ships with the static site, so the displayed version identifies that build rather than a separate live server response.

Ambient ducks fly in, land on the pond, paddle with ripples, and take off again. Small flocks occasionally cross the farm overhead. Wildlife pauses while dialogs are open or the tab is hidden; reduced-motion mode keeps the ducks resting on the pond and skips flights.

Start at the title screen, enter your farmer’s name, and press Play. Returning players can continue their saved farm and change their name. Click the Agromate logo to return to the title screen without resetting progress. Your farmer breathes and blinks while idle. A tabby cat strolls around the clearing, stalks and pounces on mice, then grooms before continuing its patrol. Title screens and dialogs pause play; reduced-motion mode keeps the cat still.

The farmer has front, back, left, and right views matching movement. After a short pause, the farmer turns toward the camera and starts breathing and blinking. The turn also updates the direction used by Space interactions. Reduced-motion mode skips the animated turn and breathing.

The fullscreen title features an original pixel-art landscape, drifting clouds, passing birds, and a wooden Agromate sign. Enter a name and Play, or Continue a saved farm. Use the explicit **Title screen** button in the game header (or the logo) to save and return to the menu. The title scene animates only while open and visible, and respects reduced-motion preferences.
