# @scanner/web

The React application turns a local MP4, WebM, or MKV recording of the English PC inventory into a downloadable GOOD v3 file. One recording can show both the weapon and artifact tabs. Inspect the thumbnail and recorded detail crop for flagged items, then correct their fields or exclude them before exporting.

The character list comes from the owners of included items. Enter their level, ascension, constellation, and base talents, or exclude their settings. Equipment keeps its owner when the configuration is excluded.

The file picker and drag-and-drop use the same playback checks. If a WebM or MKV needs repackaging, the app shows a preparation stage that can be cancelled. A device needs a working decoder for the selected video track. See the [codec matrix](../../docs/recording-formats.md).

## Run and build

Run these commands from the repository root.

```sh
bun install --frozen-lockfile
bun run dev
```

Open the URL printed by Vite. To deploy, run `bun run build` and serve the contents of `apps/web/dist/` on a static host. Keep the generated `ocr/` directory beside the site's assets so the worker can load its runtime and English model. Vite uses a relative base URL for deployment under a subpath.

## Where to make changes

- [App.tsx](src/App.tsx) composes the recording picker, review summary, artifact list, and editor. [useRecordingScan.ts](src/useRecordingScan.ts) manages scan progress, cancellation, and incoming items from the [browser adapter](../../packages/browser/README.md).
- [Editor.tsx](src/Editor.tsx) renders the fields for the selected artifact.
- [review.ts](src/review.ts) revalidates edits and hands the included artifacts to the [GOOD exporter](../../packages/good/README.md). Included cards with unresolved issues block the download.

To exercise the built UI against the private reference recording, use the [root scripts](../../README.md#root-scripts).

## Game names and languages

The UI remembers the selected language (English or Russian). Changing it during review preserves the selected artifact, edits, and GOOD keys. The recording must show the English PC inventory.

The display catalogs in [src/locales](src/locales) use artifact set, stat, and character names from Optimizer’s pinned game data. Percentage-based stats carry an explicit percent sign to distinguish them from flat stats. When updating the GOOD keys, refresh both catalogs and run the label coverage tests. [Pinned English and Russian sources](https://github.com/frzyc/genshin-optimizer/tree/f24bcb82f650ff755af9ed47956a91809f142772/libs/gi/dm-localization/assets/locales) · [Upstream license](../../packages/good/src/upstream/LICENSE)

## Custom character names and scan reports

Enter names under **Custom character names** before starting a scan. The app remembers them in local storage. A recognized Manekin owner requires review because the pinned GOOD revision cannot represent it. Choose **Unequipped** or exclude the card before export.

Once scanning finishes, run `downloadScanReport()` in the browser console to save the original readings, validation issues, and timestamps for all selections, including cards you have since edited or excluded. The report omits thumbnails, video, and the custom-name settings. Use **Export GOOD** for importing reviewed artifacts into Optimizer.
