import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { preview } from "vite";
const engine = process.argv[2] ?? "msedge";
const implementation =
  engine === "firefox" ? firefox : engine === "webkit" ? webkit : chromium;
const host = await preview({
  root: resolve("apps/web"),
  base: "/scanner/",
  preview: { host: "127.0.0.1", port: 0, open: false },
});
try {
  const browser = await implementation.launch({
    headless: true,
    ...(engine === "msedge" || engine === "chrome" || engine === "chromium"
      ? { channel: engine }
      : {}),
  });
  try {
    const page = await browser.newPage({ locale: "en-US" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = host.resolvedUrls!.local[0];
    const origin = new URL(base).origin;
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (
        url.protocol === "blob:" ||
        url.protocol === "data:" ||
        (url.origin === origin && route.request().method() === "GET")
      )
        return route.continue();
      throw new Error("Unexpected network request: " + url.origin);
    });
    await page.goto(base);
    const language = page.getByRole("combobox", { name: "Interface language" });
    await language.selectOption("ru");
    await page
      .getByRole("heading", { name: "Сканирование артефактов" })
      .waitFor();
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("lang"), "ru");
    await page.getByLabel("Язык интерфейса").selectOption("en");
    console.log(
      engine,
      browser.version(),
      process.argv[3] ?? "test-assets/33-1/video.mp4",
    );
    const customNames = page
      .locator("details")
      .filter({ hasText: "Custom character names" });
    await customNames.locator("summary").click();
    await customNames.getByLabel("Wanderer").fill("Demo Wanderer");
    await page.reload();
    await customNames.locator("summary").click();
    assert.equal(
      await customNames.getByLabel("Wanderer").inputValue(),
      "Demo Wanderer",
    );
    const started = Date.now();
    const input = page.locator("input[type=file]");
    await input.setInputFiles(process.argv[3] ?? "test-assets/33-1/video.mp4");
    await page.getByRole("button", { name: "Cancel scan" }).click();
    await page
      .getByText("Scan cancelled", { exact: true })
      .waitFor({ timeout: 5000 })
      .catch(async (e) => {
        throw new Error(
          "Cancel result: " +
            (await page.getByRole("status").allTextContents()) +
            " errors: " +
            errors.join(", "),
          { cause: e },
        );
      });
    const expectRemux = process.argv.includes("--expect-remux");
    await Promise.all([
      expectRemux && page.locator("progress:not([value])").waitFor(),
      input.setInputFiles(process.argv[3] ?? "test-assets/33-1/video.mp4"),
    ]);
    await page.waitForFunction(
      () => {
        const s = document.querySelector("output")?.textContent;
        return s && !document.querySelector("progress");
      },
      undefined,
      { timeout: 600000 },
    );
    const status = await page.getByRole("status").textContent();
    assert.equal(status, "Scan complete");
    const tiles = page.locator("nav button[data-order]");
    const count = await tiles.count();
    console.log(
      engine,
      ((Date.now() - started) / 1000).toFixed(1) + "s",
      "detected",
      count,
      "cards",
      await page.getByTestId("review-counts").textContent(),
    );
    const repeats = Number(
      process.argv[4] === "--expect-remux" ? 1 : (process.argv[4] ?? 1),
    );
    assert.ok(Number.isInteger(repeats) && repeats > 0);
    const singlePass: import("../packages/good/src").Artifact[] = JSON.parse(
      await readFile("test-assets/33-1/expected.json", "utf8"),
    ).artifacts;
    const expected = Array.from({ length: repeats }, () => singlePass).flat();
    assert.equal(count, expected.length);
    const reportDownload = page.waitForEvent("download");
    await page.evaluate(() => window.downloadScanReport!());
    const reportFile = await reportDownload;
    assert.equal(reportFile.suggestedFilename(), "genshin-scan-report.json");
    const report = JSON.parse(
      await readFile((await reportFile.path())!, "utf8"),
    );
    assert.equal(report.items.length, count);
    assert.equal(report.format, "genshin-scanner-review");
    await tiles.first().click();
    const flaggedTile = page.locator('nav [data-review="true"]').first();
    if (await flaggedTile.count()) {
      const flaggedOrder = await flaggedTile.getAttribute("data-order");
      await flaggedTile.click();
      assert.equal(await flaggedTile.getAttribute("data-review"), "true");
      assert.ok(
        (await page
          .locator('article [aria-invalid="true"], article section p')
          .count()) > 0,
      );
      await language.selectOption("ru");
      await page.getByRole("heading", { name: "Свойства артефакта" }).waitFor();
      assert.equal(
        await page
          .locator('nav [aria-pressed="true"]')
          .getAttribute("data-order"),
        flaggedOrder,
      );
      assert.equal(
        await page.getByRole("button", { name: "Скачать GOOD" }).isEnabled(),
        false,
      );
      const mainStat = page.getByLabel("Основная характеристика", {
        exact: true,
      });
      const selectedStat = await mainStat.inputValue();
      assert.equal(
        await mainStat
          .getByRole("option", { name: "Сила атаки, %", exact: true })
          .getAttribute("value"),
        "atk_",
      );
      await page.getByLabel("Язык интерфейса").selectOption("en");
      assert.equal(
        await page.getByLabel("Main stat", { exact: true }).inputValue(),
        selectedStat,
      );
    }
    await page
      .getByRole("button", { name: "Exclude artifact", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Include artifact", exact: true })
      .click();
    for (const [i, card] of expected.entries()) {
      const tile = page.locator('[data-order="' + i + '"]');
      if (!(await tile.innerText()).includes("Review")) continue;
      await tile.click();
      for (const [label, value] of [
        ["Set", card.setKey],
        ["Slot", card.slotKey],
        ["Main stat", card.mainStatKey],
        ["Rarity", String(card.rarity)],
        ["Equipped by", card.location],
        ["Lock", card.lock ? "Locked" : "Unlocked"],
      ]) {
        await page.getByLabel(label, { exact: true }).selectOption(value);
      }
      await page.getByLabel("Level", { exact: true }).fill(String(card.level));
      for (const [key, heading] of [
        ["substats", "Substats"],
        ["unactivatedSubstats", "Unactivated substats"],
      ] as const) {
        const section = page.locator("article section").filter({
          has: page.getByRole("heading", { name: heading, exact: true }),
        });
        const desired = card[key] ?? [];
        const controls = section.locator("[data-stat-row]");
        while ((await controls.count()) > desired.length)
          await controls.last().getByRole("button").click();
        while ((await controls.count()) < desired.length)
          await section.getByRole("button", { name: "Add stat" }).click();
        for (const [j, stat] of desired.entries()) {
          await controls.nth(j).locator("select").selectOption(stat.key);
          await controls.nth(j).locator("input").fill(String(stat.value));
        }
      }
      assert.equal(
        (await tile.innerText()).includes("Ready"),
        true,
        "Unresolved reference item " + (i + 1),
      );
    }
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export GOOD" }).click();
    const download = await downloadPromise;
    const path = await download.path();
    assert.ok(path);
    const data = JSON.parse(await readFile(path, "utf8"));
    assert.equal(data.version, 3);
    assert.equal(data.format, "GOOD");
    assert.equal(data.artifacts.length, expected.length);
    for (const [i, artifact] of expected.entries()) {
      assert.deepEqual(
        data.artifacts[i],
        artifact,
        "Reference mismatch on item " + (i + 1),
      );
    }
    console.log("Exported", data.artifacts.length, "reviewed artifacts");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
} finally {
  await host.close();
}
