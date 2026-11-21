// Use the installed Node worker adapter with local English data.
import { createRequire } from "node:module";
import { resolve, dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import assert from "node:assert/strict";
import {
  recognizeArtifact,
  prepareText,
  type Ocr,
} from "../packages/core/src/index";
const requireBrowser = createRequire(resolve("packages/browser/package.json"));
const { createWorker, PSM } = requireBrowser(
  "tesseract.js",
) as typeof import("../packages/browser/node_modules/tesseract.js");
const model = dirname(
  requireBrowser.resolve("@tesseract.js-data/eng/package.json"),
);
const worker = await createWorker("eng", 1, {
  langPath: join(model, "4.0.0_best_int"),
  cacheMethod: "none",
});
const read: Ocr = async (image, field) => {
  const p = prepareText(image, field);
  const png = new PNG({ width: p.width, height: p.height });
  png.data = Buffer.from(p.data);
  await worker.setParameters({
    tessedit_pageseg_mode:
      field === "header" || field === "stats"
        ? PSM.SINGLE_BLOCK
        : PSM.SINGLE_LINE,
    tessedit_char_whitelist: field === "level" ? "+0123456789" : "",
  });
  return (await worker.recognize(PNG.sync.write(png))).data.text;
};
try {
  const errors: string[] = [];
  for (const [file, set, level, rarity, stats, inactive] of [
    [
      "4-star",
      "ADayCarvedFromRisingWinds",
      0,
      4,
      [
        ["def", 17],
        ["enerRech_", 4.1],
      ],
      [],
    ],
    [
      "5-star-not-upgraded",
      "ViridescentVenerer",
      0,
      5,
      [
        ["critRate_", 3.1],
        ["critDMG_", 7],
        ["atk_", 4.7],
      ],
      [["def", 23]],
    ],
    [
      "5-star-full",
      "HeartOfTheFurnace",
      20,
      5,
      [
        ["critDMG_", 7.8],
        ["critRate_", 5.8],
        ["def", 42],
        ["enerRech_", 15.5],
      ],
      [],
    ],
  ] as const) {
    const result = await recognizeArtifact(
      PNG.sync.read(readFileSync(resolve("test-assets", file + ".png"))),
      read,
    );
    try {
      assert.ok(result);
      const a = result.draft;
      assert.deepEqual([a.setKey, a.level, a.rarity], [set, level, rarity]);
      assert.deepEqual(
        a.substats?.map((s) => [s.key, s.value]),
        stats,
      );
      assert.deepEqual(
        a.unactivatedSubstats?.map((s) => [s.key, s.value]),
        inactive,
      );
      assert.deepEqual(
        result.issues,
        file === "5-star-full" ? ["location"] : [],
      );
      assert.equal(a.lock, file !== "4-star");
      console.log(file + " OK");
    } catch (e) {
      console.log(file, result?.text, result?.issues);
      errors.push(String(e));
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await worker.terminate();
}
