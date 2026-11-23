# Genshin Scanner

Turn a Genshin Impact inventory recording into a [GOOD](https://github.com/frzyc/genshin-optimizer/tree/master/libs/gi/good) file for Genshin Optimizer. You select items manually in the game. The scanner reads the recording in your browser, flags uncertain values for review, and keeps the video and extracted frames on your device.

## Scan an inventory

1. Open the artifact inventory in the English PC version of the game. Record your screen while selecting each 4★ or 5★ artifact you want to export. Leave its detail panel visible long enough for the text to settle.
2. Open the scanner. If you renamed the Traveler, Wanderer, or Manekin, enter their in-game names under **Custom character names** before choosing the recording. It detects item changes, reads each panel, and shows a thumbnail and timestamp for each artifact.
3. Review flagged cards against the recorded panel. Correct the fields or exclude the item, then choose **Export GOOD**.
4. In Genshin Optimizer, open **Settings → Current Database → Upload**, select the JSON file, and review the import summary before updating the database.

Choose MP4 (H.264, HEVC, AV1), WebM (VP8, VP9), or MKV (H.264, HEVC, AV1). Playback depends on the browser and the codecs available on the device. See [recording formats and verification](docs/recording-formats.md).

The full scan, review, and export workflow has been tested in desktop Chromium, Edge, and Firefox. See the [project status](docs/PROJECT-STATE.md) for results and outstanding browser checks.

## Run locally

Use Bun 1.3.6 from the repository root.

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Vite. To build the static site, run `bun run build` and serve `apps/web/dist/`. The build includes the OCR worker, WebAssembly runtime, and English model.

## Development

| Workspace                                        | Use it for                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| [`@scanner/good`](packages/good/README.md)       | GOOD types, validation, export, and updating the pinned Optimizer schema.       |
| [`@scanner/core`](packages/core/README.md)       | Recognizing artifacts from pixels with an OCR function supplied by the caller.  |
| [`@scanner/browser`](packages/browser/README.md) | Scanning a local video in a browser, including decoding, OCR, and cancellation. |
| [`@scanner/web`](apps/web/README.md)             | Running the React application to scan, review, and download artifacts.          |

### Using the libraries in another project

The three libraries can be released independently from this monorepo. Their current manifests have `private: true` and no version. Before the first public release, choose an npm scope you control, update package names and imports if needed, set versions, and enable publication for the libraries. Build with `bun run build:libs`. Point the published exports at the built JavaScript and declarations, including the development and Bun conditions that currently resolve to source. Include the build output and applicable licenses and notices in each tarball.

Run `bun pm pack` in each library and test the tarballs together in a clean consumer. Release `good` first, then `core`, then `browser`, with public access. Bun converts `workspace:*` dependencies to their exact versions when publishing. An application can then install just the library it imports with `bun add` or `npm install`. For browser OCR, the application must also serve the worker, WebAssembly files, and model. See the [browser setup](packages/browser/README.md), [Bun workspace documentation](https://bun.com/docs/pm/workspaces), and [npm guide to public scoped packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

### Root scripts

Run these commands from the repository root after installing dependencies.

| Command                 | Purpose                                                                                                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run dev`           | Prepare local OCR assets and start the Vite development server.                                                                                                                                                                           |
| `bun run build:libs`    | Build the three libraries as ES modules and emit TypeScript declarations in each package's `dist/` directory.                                                                                                                             |
| `bun run ocr:assets`    | Copy the OCR worker, WebAssembly runtimes, English model, and license notices into `apps/web/public/ocr/`.                                                                                                                                |
| `bun run build`         | Build the libraries, prepare OCR assets, and produce the static site in `apps/web/dist/`.                                                                                                                                                 |
| `bun run test`          | Run the public Bun tests in `tests/` using synthetic or public fixtures.                                                                                                                                                                  |
| `bun run typecheck`     | Check TypeScript across the project and check the core separately without DOM types.                                                                                                                                                      |
| `bun run format`        | Rewrite project files using Prettier and the repository's ignore rules.                                                                                                                                                                   |
| `bun run format:check`  | Report files that would change under Prettier.                                                                                                                                                                                            |
| `bun run check`         | Run the public tests, formatting check, type checks, and production build in sequence.                                                                                                                                                    |
| `bun run check:frames`  | Run English OCR on the three private reference PNGs in `test-assets/` and check recognized fields and review flags.                                                                                                                       |
| `bun run check:video`   | Use FFmpeg to compare the detector's count and order with the 33 reference PNGs for `test-assets/33-1/video.mp4`.                                                                                                                         |
| `bun run check:browser` | Test cancellation, review, exclusion, and GOOD download against the private recording and annotations. Run `bun run build` first. Requires Node with TypeScript support and an installed Playwright-compatible browser. Defaults to Edge. |
| `bun run check:corpus`  | Compare raw scan results with manual GOOD annotations in Edge. Accepts a recording and an optional reference file. See [recognition checks](docs/recognition.md).                                                                         |

For another browser, use e.g. `bun run check:browser firefox`. The optional arguments are the browser (`msedge`, `chrome`, `chromium`, `firefox`, or `webkit`), the recording path, and the number of repetitions of the reference clip in that recording. Append `--expect-remux` to require the local repackaging step for an unindexed fixture. See the [verification results](docs/PROJECT-STATE.md#verification) and [v1 architecture](docs/v1-ARCHITECTURE.md).

## TBD

- [x] Add numeric regression fixtures and compare raw scan results against annotated recordings.
- [x] Recognize custom names for the Traveler, Wanderer, and Manekin. Flag equipped Manekin artifacts until GOOD provides an owner key.
- [x] Migrate the web interface to Tailwind CSS.
- [x] Highlight missing fields in the review form so players can find what blocks export.
- [x] Localize the application interface with i18n.
- [x] Support video formats and codecs beyond MP4 and H.264.
- [ ] Verify the full workflow in Safari on macOS and with footage recorded in a native 16:9 game layout.
- [ ] Add a layout profile for recordings from the mobile game.
- [ ] Automate GOOD package schema update (load JSON schemas from GO upstream)

## License

Genshin Scanner is distributed under the [MIT License](LICENSE). See the [Optimizer source notice](packages/good/UPSTREAM.md) and [OCR license notes](packages/browser/OCR.md) for third-party components.
