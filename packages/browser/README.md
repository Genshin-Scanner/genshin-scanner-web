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

## Serve the OCR assets

Pass the URL of a static directory containing `worker.min.js`, the Tesseract core JavaScript and WebAssembly variants, and `eng.traineddata.gz`. In this monorepo, `bun run ocr:assets` prepares that directory in `apps/web/public/ocr/`. An embedding application can serve its contents, including the notices, under its own base URL. The browser loads these files on demand. It reads the recording locally.

For single images, call `openBrowserOcr(assetBase)`, pass its `read` function to the [core recognizer](../core/README.md), and call `close()` in a `finally` block. See the [OCR model and runtime notices](OCR.md).
