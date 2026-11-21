# Genshin Scanner v1 architecture

## First release

A player selects a local recording, reviews the extracted cards, corrects uncertain fields, and downloads a GOOD v3 file. The first release targets 4★ and 5★ artifacts in the English PC inventory, recorded as MP4/H.264. The acceptance targets include 16:9 and 16:10 footage and desktop Chrome, Edge, Firefox, and Safari. Vite builds the static site for GitHub Pages. Processing takes place on the player's device. See the [project status](PROJECT-STATE.md) for verified configurations.

## Monorepo

Bun manages workspaces, dependencies, the lockfile, and verification commands. Vite builds the site and standalone ES modules. TypeScript emits declarations for consumers. Packages import each other through their public entry points so a library can be embedded in Optimizer or moved to a separate repository.

| Component          | Responsibility and interface                                                                                                                                                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`    | Accepts frame dimensions, RGBA pixels, and timestamps. Identifies the screen, detects when a player selects an item, locates the card, and calls an injected OCR function. Returns the fields it read and reasons for review. Also accepts a single image. The caller supplies runtime dependencies. |
| `packages/good`    | Adapts Optimizer schemas. Provides field types, lookup keys, completed-artifact validation, and GOOD serialization. The caller supplies the export source name.                                                                                                                                      |
| `packages/browser` | Takes a local `File`, decodes it in the browser, supplies pixels to the core, runs OCR in a worker, bounds pending work, and releases resources. Reports progress and results, supports cancellation, and reads frames at specific timestamps for review.                                            |
| `apps/web`         | Provides file selection, an artifact list, a review form, and download in React. Reports format errors and lets the player cancel a scan or explicitly exclude unresolved items.                                                                                                                     |

The site depends on the browser adapter, the adapter on the core, and the core on GOOD. The site also uses GOOD for export. The core's public types use numbers, typed arrays, keys, and OCR results. Its TypeScript checks run without the DOM library. An embedding application can supply its own pixels and OCR function or use the browser adapter for the complete video workflow.

## Types and reference data

Optimizer defines the format with Zod. Pin an upstream commit and keep the required schemas and key tables with their minimal dependencies. Record the source, revision, and license alongside adapted code. Derive domain types with `z.infer` and obtain the exported artifact type from an element of `artifacts`. Use the same field types for partial recognition results. Keep timestamps, OCR evidence, and reasons for review with the scan result.

Check required fields and game constraints before handing an artifact to the upstream schema. Some fields have defaults that could hide a failed reading. Keep such readings visible until corrected. When changing the pinned revision, rerun the type checks, reference-frame tests, and Optimizer import check. [GOOD schema](https://github.com/frzyc/genshin-optimizer/blob/master/libs/gi/good/src/schemas/good-format.ts) · [Artifact schema](https://github.com/frzyc/genshin-optimizer/blob/master/libs/gi/schema/src/artifact.ts) · [Optimizer image processing](https://github.com/frzyc/genshin-optimizer/blob/master/libs/gi/art-scanner/src/lib/processImg.ts)

## Layouts, languages, and images

- **Layout.** A profile locates the visible game area and UI landmarks, then identifies the inventory tab, grid, selection, detail panel, and item artwork relative to them. Test the PC profile at both target aspect ratios. Accept other aspect ratios when landmarks match and return an explicit result when they cannot be found. Add a separate profile and fixtures for the mobile HUD, including its selection indicators. Test mobile footage and running the scanner in a mobile browser independently.
- **Game language.** The English profile specifies the OCR model, display names and their GOOD keys, numeric separators, and markers such as `(unactivated)`. Item-change detection operates independently of the vocabulary. The site locale and recorded game language can be configured independently. The first release needs only the English profile.
- **Artwork.** Crop the illustration from the selected card header. This provides a thumbnail even if OCR fails and requires no external image API. Retain a small thumbnail and timestamp for each item. Show an enlarged crop of the recorded details during review.

## Processing a recording

1. Check whether the browser can decode the recording, then read its dimensions and duration. Use reduced-resolution regions for detection and original-resolution pixels for OCR.
2. Skip weapon screens, menus, and transitions. Use both the detail panel and the inventory grid to identify a stable selection. Hovering over another cell should preserve the current selection. Selecting two distinct items with identical stats should produce two records.
3. Choose a sharp, stable frame for each selection. Bound pending images, slow or pause file reads under load, and revisit skipped intervals by timestamp when necessary. If a reading is uncertain, try another frame from the same selection. Return one card for review if uncertainty remains.
4. Show thumbnails, timestamps, and uncertain fields. Allow the player to correct any card, choose its equipped character, or exclude it. Export confirmed items and report the counts of included, excluded, and unsupported items.

## Milestones and acceptance criteria

1. **Single-frame recognition.** Set up Bun workspaces, public entry points, and Vite builds. Reproduce Optimizer's results on three PNGs: a +0 plume with unactivated DEF +23, 4★ sands with exactly two substats, and a +20 flower with four substats. Verify the OCR model's distribution license and serve the worker, WASM, and model with the site.
2. **Item detection.** Before running OCR, produce exactly 33 selections from the reference recording in their original order. Check initial weapon screens, hovering, identical items, and repeatability separately. Use additional short samples for scenarios absent from the recording.
3. **End-to-end recognition.** Compare extracted fields with the manual annotations. Each of the 33 items must match its reference or be flagged for review. Count missed items, duplicates, incorrectly accepted cards, and manual corrections.
4. **Editor and export.** Correct and download the results through the UI. Import GOOD into Optimizer and compare item counts, owners, stats, and unactivated substats. Verify cancellation, file reselection, and local-only frame processing.
5. **Release readiness.** Check 16:9 and 16:10 recordings across the target browsers, including Safari on macOS. Measure speed and memory on the reference machine and repeat on a long recording. Publish the static site after acceptance.

Keep changes in small, verifiable commits. The Git-ignored `test-assets/` directory holds the private `count-33.mp4` recording and reference PNGs. For public regression fixtures, create separate images with an opaque UID mask and stripped metadata. Inspect the final pixels and staged files. Use synthetic data for core tests as well. Keep the full recording local.
