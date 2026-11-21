# Genshin Scanner

Turn a Genshin Impact inventory recording into a [GOOD](https://github.com/frzyc/genshin-optimizer/tree/master/libs/gi/good) file for Genshin Optimizer. You select items manually in the game. The scanner reads the recording in your browser, flags uncertain values for review, and keeps the video and extracted frames on your device.

## Scan an inventory

1. Open the artifact inventory in the English PC version of the game. Record an MP4 using H.264 while selecting each 4★ or 5★ artifact you want to export. Leave its detail panel visible long enough for the text to settle.
2. Open the scanner and choose the recording. It detects item changes, reads each panel, and shows a thumbnail and timestamp for each artifact.
3. Review flagged cards against the recorded panel. Correct the fields or exclude the item, then choose **Export GOOD**.
4. In Genshin Optimizer, open **Settings → Current Database → Upload**, select the JSON file, and review the import summary before updating the database.

The full scan, review, and export workflow has been tested in desktop Chromium, Edge, and Firefox. See the [project status](docs/PROJECT-STATE.md) for results and outstanding browser checks.

## Run locally

Use Bun 1.3.6 from the repository root.

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Vite. To build the static site, run `bun run build` and serve `apps/web/dist/`. The build includes the OCR worker, WebAssembly runtime, and English model.

## Development

Run `bun run check` for the public tests, formatting, type checks, and production build. The parsing core accepts pixels and an OCR function, so another application can use it independently of the React site. The [v1 architecture](docs/v1-ARCHITECTURE.md) describes the package boundaries. The [verification guide](docs/PROJECT-STATE.md#verification) lists the additional checks that use private recordings and annotations.

## TBD

- [ ] Improve recognition accuracy by turning cases from the existing manual annotations into targeted regression tests.
- [ ] Let players enter their custom Wanderer and Traveler names so equipped artifacts map to the correct GOOD character keys.
- [ ] Migrate the web interface to Tailwind CSS.
- [ ] Highlight missing fields in the review form so players can find what blocks export.
- [ ] Localize the application interface with i18n.
- [ ] Support video formats and codecs beyond MP4 and H.264.
- [ ] Verify the full workflow in Safari on macOS and with footage recorded in a native 16:9 game layout.
- [ ] Add a layout profile for recordings from the mobile game.

## License

Genshin Scanner is distributed under the [MIT License](LICENSE). See the [Optimizer source notice](packages/good/UPSTREAM.md) and [OCR license notes](packages/browser/OCR.md) for third-party components.
