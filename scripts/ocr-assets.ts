import { createRequire } from "node:module";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
const requireBrowser = createRequire(resolve("packages/browser/package.json"));
const tess = dirname(requireBrowser.resolve("tesseract.js/package.json"));
const core = dirname(
  createRequire(join(tess, "package.json")).resolve(
    "tesseract.js-core/package.json",
  ),
);
const model = dirname(
  requireBrowser.resolve("@tesseract.js-data/eng/package.json"),
);
const out = resolve("apps/web/public/ocr");
mkdirSync(out, { recursive: true });
copyFileSync(join(tess, "dist/worker.min.js"), join(out, "worker.min.js"));
for (const suffix of ["", "-simd", "-lstm", "-simd-lstm"])
  for (const ext of [".wasm.js", ".wasm"]) {
    const name = "tesseract-core" + suffix + ext;
    copyFileSync(join(core, name), join(out, name));
  }
copyFileSync(
  join(model, "4.0.0_best_int/eng.traineddata.gz"),
  join(out, "eng.traineddata.gz"),
);
copyFileSync(join(tess, "LICENSE.md"), join(out, "LICENSE-Tesseract.txt"));
copyFileSync(join(core, "LICENSE"), join(out, "LICENSE-core.txt"));
copyFileSync(
  resolve("packages/good/src/upstream/LICENSE"),
  join(out, "LICENSE-Optimizer.txt"),
);
copyFileSync(resolve("packages/browser/OCR.md"), join(out, "MODEL-NOTICE.txt"));
