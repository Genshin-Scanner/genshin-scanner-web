# Genshin Scanner project status

The scanner processes a local inventory recording and exports GOOD v3. It finds English 4★ and 5★ artifact cards, shows thumbnails and timestamps, flags uncertain fields, and lets the player exclude items before export. The static site includes its OCR assets.

## Running the site

From the repository root, run `bun install --frozen-lockfile`, then `bun run dev`. Vite prints the local URL. Run `bun run build` to generate the static site in `apps/web/dist/`. A GitHub Pages deployment is pending.

## Verification

| Command                        | What it checks                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run check`                | Public regression tests, Prettier, TypeScript, and production builds of the three libraries and the site.                                                                                                                                                                                                             |
| `bun run check:frames`         | Local OCR on three private reference PNGs.                                                                                                                                                                                                                                                                            |
| `bun run check:video`          | Uses FFmpeg to decode the recording and compares the detector’s item sequence with 33 reference PNGs.                                                                                                                                                                                                                 |
| `bun run check:browser msedge` | Exercises cancellation, correction, exclusion, and download through the production UI. Also accepts `chromium`, `firefox`, or `webkit`. Requires Node with TypeScript support, the selected browser, a production build, the private recording, and the manual reference data in `test-assets/expected-private.json`. |

The original 1920×1200 recording lasts 56.4 seconds. Edge, Chromium, and Firefox each detected all 33 artifacts and flagged seven for review. After correction, every checked field in each export matched the independent manual annotations. A synthetic artifact produced by the exporter was also imported through the database UI in Genshin Optimizer 10.40.0.

Edge passed a second test using a padded 1920×1080 copy. It flagged 14 of 33 items. Verifying the game's native 16:9 layout still requires footage recorded at that aspect ratio. The Windows Playwright WebKit build could not decode either test H.264 file. Safari support still needs verification on macOS.

On a 2 minute 49 second recording made by repeating the 16:9 clip three times, Edge found 99 items in 260 seconds. After review of 42 cards, all 99 exported artifacts matched the annotations. One working-set sample taken during the run measured 807 MiB across the test browser's processes. This figure includes the browser and represents a single observation.

## Components

`@scanner/core` accepts pixels and an OCR function and builds without DOM types. `@scanner/good` provides types and validation from the pinned Optimizer schema and roll tables. `@scanner/browser` reads local video sequentially, handles cancellation, and runs the OCR worker. A profile supplies the language, layout, and item-change detector. The React UI uses Tailwind CSS utilities and lives in `apps/web`. See the [v1 architecture and acceptance criteria](v1-ARCHITECTURE.md).
