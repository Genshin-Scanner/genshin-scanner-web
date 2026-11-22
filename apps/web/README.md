# @scanner/web

The React application turns a local MP4/H.264 recording of the English PC artifact inventory into a downloadable GOOD v3 file. Select a recording, inspect the thumbnail and recorded detail crop for each flagged artifact, then correct its fields or exclude it before exporting.

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
