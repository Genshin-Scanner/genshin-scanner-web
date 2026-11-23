# Mixed inventory and character review

A scan accepts one English PC inventory recording of 3–5★ weapons and 4–5★ artifacts. Users switch tabs and select items in the game. The scanner detects both categories and exports a single GOOD v3 file. [Project status](PROJECT-STATE.md)

## Frame detection

`markInventoryFrame` uses the gold underline in the inventory tab bar to identify the active category. It compares consecutive card fingerprints and keeps a category on each settled segment. Weapon fingerprints include the card title, artwork, level, refinement, lock, and equipped banner. Weapon selection also tracks the focused tile by column and vertical center. A stable move between tiles creates separate selections even when the right-hand cards match. When the grid scrolls, the detector reanchors its selection before comparing tile positions again.

The browser adapter uses one media element and one OCR worker for the recording. It samples the timeline once at low resolution, then revisits the chosen frames at OCR resolution. The core uses shared panel anchors and separate field layouts for the two categories. The selected weapon's level cap determines ascension. The OCR readings are checked against the pinned GOOD keys, weapon rarity and type, and Optimizer's level boundaries. The selection logic can only distinguish copies whose selections are visible in the recording.

## Review and export

Both item editors retain the original readings in the scan report. The review shows a character once for each recognized owner of included items. Character forms require level, ascension, constellation, and base talent levels. The Traveler also needs an elemental form. The Manekin alias is retained as review evidence because the pinned GOOD schema has no owner key for it.

The export contains valid included items and any included character configurations. Excluding a configuration retains its owner on the items. Optimizer can create a missing character with default settings from that equipment. [GOOD and upstream types](../packages/good/UPSTREAM.md)
