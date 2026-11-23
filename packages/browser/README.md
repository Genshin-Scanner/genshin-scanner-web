# @scanner/browser

Use `scanVideo` to scan a local inventory recording in a browser. It decodes the video with the browser's media APIs, samples frames to locate selections, and runs OCR on full-resolution card regions. The default profile reads English PC inventory footage.

```ts
import { scanVideo, type ScanItem } from "@scanner/browser";

async function scan(file: File, assetBase: URL, signal: AbortSignal) {
  const items: ScanItem[] = [];
  const skipped = await scanVideo(
    file,
    assetBase,
    signal,
    ({ phase, done, total }) => console.log(phase, done, total),
    (item) => items.push(item),
  );
  return { items, skipped };
}
```

Each item includes its timestamp in seconds, artifact draft, review issues, thumbnail (`image`), and detail crop (`detail`). The returned count covers detected selections skipped because of rarity. To cancel, abort the controller that owns the signal. A caller that supplies its own game profile can pass it as the sixth argument.

## Recording input

The exported `recordingAccept` string can be passed to a file picker. `scanVideo` checks the actual video dimensions, finite duration, and forward and backward seeks. The native path uses a blob URL for the original file. If a Matroska or WebM input fails the opening checks, the adapter loads Mediabunny and copies compressed video packets to a seekable local Blob. The host receives `Preparing recording` with `total: 0` for indeterminate progress. An abort signal also cancels preparation. See [formats, limitations, and verification](../../docs/recording-formats.md).

## Serve the OCR assets

Pass the URL of a static directory containing `worker.min.js`, the Tesseract core JavaScript and WebAssembly variants, and `eng.traineddata.gz`. In this monorepo, `bun run ocr:assets` prepares that directory in `apps/web/public/ocr/`. An embedding application can serve its contents, including the notices, under its own base URL. The browser loads these files on demand. It reads the recording locally.

For single images, call `openBrowserOcr(assetBase)`, pass its `read` function to the [core recognizer](../core/README.md), and call `close()` in a `finally` block. See the [OCR model and runtime notices](OCR.md).

The PC profile enlarges lower-resolution video frames before OCR. The detection pass uses a smaller canvas. Both passes share one video element and read one timestamp at a time. An embedding app can set `profile.locale` to `createEnglishProfile(names)` from the core to resolve custom character names.
