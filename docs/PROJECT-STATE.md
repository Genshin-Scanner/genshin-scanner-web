# Genshin Scanner project status

The scanner processes a local inventory recording and exports GOOD v3. It shows thumbnails and timestamps, flags uncertain fields, and lets the player exclude items before export. The English and Russian interfaces use i18next. The header language selector remembers the player’s preference. OCR reads English game footage. The artifact editor and list display localized game names while preserving GOOD keys in exports. The editor identifies missing fields, invalid stat keys and values, and group-wide roll constraints. The static site includes its OCR assets.

The scanner accepts MP4, WebM, and Matroska recordings. [Recording formats](recording-formats.md) covers codec pairs, local repackaging, browser results, and the procedure for testing a new combination.

Custom character names are optional, saved on the device, and applied to the next scan. Traveler and Wanderer export under their GOOD keys. Manekin equipment requires an explicit review decision. After scanning, the browser console command `downloadScanReport()` saves the original readings and timestamps for diagnosis.

A single recording can show 3–5★ weapons and 4–5★ artifacts. The Weapons review reads name, level, ascension, refinement, lock, and equipped character. The Characters review collects owners of included items and offers level, ascension, constellation, and base talent fields. Users can exclude a character configuration while preserving equipment ownership. The app saves all included categories in one GOOD v3 file. [Mixed inventory architecture](v2-ARCHITECTURE.md)

## Running the site

The header and browser tab share the scanner icon. The header links to the official game site and Genshin Optimizer. The help button next to GOOD export explains how to import the file in Optimizer. The footer credits the project contributors and links to the source repository and the MIT license served with the build.

From the repository root, run `bun install --frozen-lockfile`, then `bun run dev`. Vite prints the local URL. Run `bun run build` to generate the static site in `apps/web/dist/`. A GitHub Pages deployment is pending.

## Verification

The [Checks workflow](../.github/workflows/check.yml) runs `bun run check` on Ubuntu for pull requests targeting `main`, including PRs from forks. The `check` job can serve as a required status check in the branch ruleset.

The [Pages workflow](../.github/workflows/pages.yml) also calls Checks on pushes to `main` and on manual deployments from `main`. That call uploads the checked production build from `apps/web/dist/`. The deployment job publishes that artifact after Checks succeeds.

<!-- prettier-ignore -->
| Command | What it checks |
|---------|----------------|
| `bun run check` | Public regression tests, Prettier, TypeScript, and production builds of the three libraries and the site. |
| `bun run check:frames` | Local OCR on three private reference PNGs. |
| `bun run check:video` | Uses FFmpeg to decode the recording and compares the detector’s item sequence with 33 reference PNGs. |
| `bun run check:browser msedge` | Exercises cancellation, correction, exclusion, and download in the built UI against the 33-artifact reference. Pass a recording path and `--mixed` to exercise weapons and character forms together. |
| `bun run check:corpus [recording] [reference]` | Runs Edge and compares annotated item arrays in selection order. Pass `--unannotated` to save counts and field issues without a reference. [Private corpus workflow](recognition.md) |

### Mixed inventory checks

Edge 158.0.4370.33 processed the full 7 minute 52 second English PC recording. It found 98 weapon selections and 448 artifact selections in 480.5 seconds. Three weapons and eight artifacts flagged the equipped character field. The recording has no manual reference yet, so these are detection and review counts. The same scanner matched all annotated artifacts in the three earlier recordings below.

An Edge test on a short excerpt edited a weapon's refinement, filled one character form, and exported five weapons, five artifacts, and one character together. Genshin Optimizer 10.40.0 accepted a separate synthetic mixed export and initialized the character whose equipment was included without a character configuration. A pixel regression test checks that two highlighted inventory tiles produce separate selections even when their weapon panels are identical.

### Raw recognition results

Edge 158.0.4370.33 produced the following results before any UI corrections, with the recorded Traveler name supplied. Each exact match includes equipped owner, lock state, active and unactivated substats. The per-recording references account for two differences verified on the source frames. [Reference details](recognition.md#november-2026-private-references)

<!-- prettier-ignore -->
| Recording | Selections found | Exact matches | Flagged before → after |
|-----------|-----------------:|--------------:|-----------------------:|
| 33-item reference | 33 | 33 | 7 → 0 |
| 120-item ShadowPlay, 1920×1200 | 120 | 120 | 20 → 0 |
| 120-item OBS, 1280×720, including its opening selection | 121 | 121 | 99 → 0 |

The previous OBS scanner returned 119 cards. The updated detector distinguishes consecutive plumes by changes across multiple substat lines. The public tests include cropped numeric regressions for 11.1%, 11.7%, and Elemental Mastery +21.

### Earlier browser and format checks

On the Windows format matrix, Edge exported all 33 reference artifacts for all seven added container/codec pairs. Firefox completed the five pairs using H.264, AV1, VP8, or VP9. Its HEVC decoder rejected both containers on this machine. Separate Edge checks exercise local repackaging of unindexed files. [Fixture settings and results](recording-formats.md#browser-results-on-windows)

Before the recognition update, the original 1920×1200 recording lasts 56.4 seconds. Edge, Chromium, and Firefox each detected all 33 artifacts and flagged seven for review. After correction, every checked field in each export matched the independent manual annotations. A synthetic artifact produced by the exporter was also imported through the database UI in Genshin Optimizer 10.40.0.

Edge passed a second test using a padded 1920×1080 copy. It flagged 14 of 33 items. Verifying the game's native 16:9 layout still requires footage recorded at that aspect ratio. The Windows Playwright WebKit build could not decode either test H.264 file. Safari support still needs verification on macOS.

On a 2 minute 49 second recording made by repeating the 16:9 clip three times, Edge found 99 items in 260 seconds. After review of 42 cards, all 99 exported artifacts matched the annotations. One working-set sample taken during the run measured 807 MiB across the test browser's processes. This figure includes the browser and represents a single observation.

## Components

`@scanner/core` accepts pixels and an OCR function and builds without DOM types. `@scanner/good` provides types and validation from the pinned Optimizer schema and roll tables. `@scanner/browser` reads local video sequentially, handles cancellation, and runs the OCR worker. A profile supplies the language, layout, and item-change detector. The React UI uses Tailwind CSS utilities and lives in `apps/web`. See the [v1 architecture and acceptance criteria](v1-ARCHITECTURE.md).
