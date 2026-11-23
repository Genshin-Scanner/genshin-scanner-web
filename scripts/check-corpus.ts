import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { chromium } from "playwright";
import { build, preview } from "vite";
import type { InventoryGoodFile } from "../packages/good/src";
import { compare } from "./corpus/compare.ts";

const filename = resolve(process.argv[2] ?? "test-assets/33-1/video.mp4");
const unannotated = process.argv[3] === "--unannotated";
const annotations = resolve(
  (!unannotated && process.argv[3]) ||
    resolve(dirname(filename), "expected.json"),
);
const expected: InventoryGoodFile | undefined = unannotated
  ? undefined
  : JSON.parse(await readFile(annotations, "utf8"));
if (!unannotated) {
  assert.ok(
    Array.isArray(expected?.artifacts) || Array.isArray(expected?.weapons),
    "The reference must contain at least one item array.",
  );
}
const root = resolve("apps/web");
const bundles = await build({
  configFile: false,
  root,
  logLevel: "error",
  resolve: { conditions: ["development", "browser"] },
  build: {
    write: false,
    lib: {
      entry: resolve("scripts/corpus/scan.ts"),
      formats: ["es"],
      fileName: () => "scanner.js",
    },
  },
});
const compiled = Array.isArray(bundles) ? bundles[0] : bundles;
assert("output" in compiled);
const chunks = new Map(
  compiled.output
    .filter((chunk) => chunk.type === "chunk")
    .map((chunk) => [chunk.fileName, chunk.code]),
);
const host = await preview({
  configFile: false,
  root,
  preview: { host: "127.0.0.1", port: 0, open: false },
});
try {
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const page = await browser.newPage();
    const origin = new URL(host.resolvedUrls!.local[0]).origin;
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      assert.equal(url.origin, origin, "The recording must stay local.");
      if (url.pathname === "/")
        return route.fulfill({
          contentType: "text/html",
          body: "<input type=file>",
        });
      if (url.pathname.startsWith("/entry/")) {
        const code = chunks.get(url.pathname.slice("/entry/".length));
        assert.ok(code);
        return route.fulfill({ contentType: "text/javascript", body: code });
      }
      return route.continue();
    });
    await page.goto(origin);
    await page.locator("input").setInputFiles(filename);
    const output = await page.evaluate(
      async (names) => {
        const url = "/entry/scanner.js";
        const { scan } = (await import(url)) as typeof import("./corpus/scan");
        const file = document.querySelector("input")!.files![0];
        return scan(file, names);
      },
      {
        Traveler: process.env.SCANNER_TRAVELER,
        Wanderer: process.env.SCANNER_WANDERER,
        Manekin: process.env.SCANNER_MANEKIN,
      },
    );
    const artifacts = output.items.filter((item) => item.kind === "artifact");
    const weapons = output.items.filter((item) => item.kind === "weapon");
    const artifactComparison =
      expected?.artifacts && compare(artifacts, expected.artifacts);
    const weaponComparison =
      expected?.weapons && compare(weapons, expected.weapons);
    const seconds = Object.fromEntries(
      Object.entries(output.milliseconds).map(([phase, time]) => [
        phase,
        Math.round(time / 100) / 10,
      ]),
    );
    const summary = {
      file: basename(filename),
      reference: expected && basename(annotations),
      browser: browser.version(),
      artifacts: {
        detected: artifacts.length,
        flagged: artifacts.filter((item) => item.issues.length).length,
        ...artifactComparison,
      },
      weapons: {
        detected: weapons.length,
        flagged: weapons.filter((item) => item.issues.length).length,
        ...weaponComparison,
      },
      skipped: output.skipped,
      seconds,
    };
    const dir = resolve(
      "test-assets/qa-tmp/corpus",
      basename(dirname(filename)),
    );
    await mkdir(dir, { recursive: true });
    const report = resolve(dir, basename(filename) + ".json");
    await writeFile(
      report,
      JSON.stringify({ summary, items: output.items }, null, 2),
    );
    console.log(summary, report);
    for (const [kind, actual, reference] of [
      ["Artifacts", artifacts, expected?.artifacts],
      ["Weapons", weapons, expected?.weapons],
    ] as const) {
      if (!reference) continue;
      assert.ok(
        isDeepStrictEqual(
          actual.map((item) => item.draft),
          reference,
        ),
        kind + " differ from the annotations. See the private report.",
      );
      assert.ok(
        actual.every((item) => !item.issues.length),
        "Unresolved " + kind.toLowerCase() + " review flags",
      );
    }
  } finally {
    await browser.close();
  }
} finally {
  await host.close();
}
