import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { chromium, firefox, webkit, type Page } from "playwright";
import type { InventoryGoodFile } from "../packages/good/src";
import { preview } from "vite";
const engine = process.argv[2] ?? "msedge";
const mixed = process.argv.includes("--mixed");
const implementation =
  engine === "firefox" ? firefox : engine === "webkit" ? webkit : chromium;
const host = await preview({
  root: resolve("apps/web"),
  base: "/scanner/",
  preview: { host: "127.0.0.1", port: 0, open: false },
});

async function downloadGood(page: Page): Promise<InventoryGoodFile> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export GOOD", exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  assert.ok(path);
  const data = JSON.parse(await readFile(path, "utf8"));
  assert.equal(data.version, 3);
  assert.equal(data.format, "GOOD");
  return data;
}

async function openCharacters(page: Page) {
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  return page
    .getByRole("navigation", { name: "Characters" })
    .getByRole("button");
}

async function checkMixedInventory(page: Page) {
  const exportButton = page.getByRole("button", {
    name: "Export GOOD",
    exact: true,
  });
  const editOptions = [
    { tab: "Weapons", name: "Exclude weapon" },
    { tab: "Artifacts", name: "Exclude artifact" },
  ];
  for (const { tab, name } of editOptions) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    const tiles = page.locator("nav button[data-order]");
    assert.ok(await tiles.count(), tab + " were detected");
    const flagged = page.locator('nav button[data-order][data-review="true"]');
    while (await flagged.count()) {
      await flagged.first().click();
      await page.getByRole("button", { name, exact: true }).click();
    }
  }
  await page.getByRole("button", { name: "Weapons", exact: true }).click();
  const validWeapon = page
    .locator("nav button[data-order]")
    .filter({ hasText: "Ready" })
    .first();
  await validWeapon.click();
  const weaponKey = await page
    .getByLabel("Weapon", { exact: true })
    .inputValue();
  const rank = page.getByLabel("Refinement rank", { exact: true });
  const editedRank = (await rank.inputValue()) === "4" ? "5" : "4";
  await rank.selectOption(editedRank);
  const ownerButtons = await openCharacters(page);
  assert.ok((await ownerButtons.count()) >= 2);
  assert.equal(await exportButton.isEnabled(), false);
  const owner = ownerButtons.filter({ hasNotText: "Traveler" }).first();
  await owner.click();
  const index = await owner.evaluate((el) =>
    Array.from(el.parentElement!.children).indexOf(el),
  );
  await page.getByLabel("Level", { exact: true }).fill("90");
  await page.getByLabel("Ascension", { exact: true }).selectOption("6");
  await page.getByLabel("Constellation", { exact: true }).fill("2");
  for (const [label, value] of [
    ["Normal attack", "7"],
    ["Elemental skill", "8"],
    ["Elemental burst", "9"],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  for (let i = 0; i < (await ownerButtons.count()); i++) {
    if (i === index) continue;
    await ownerButtons.nth(i).click();
    await page
      .getByRole("checkbox", { name: "Exclude character settings" })
      .check();
  }
  const data = await downloadGood(page);
  assert.ok(data.artifacts?.length);
  assert.ok(data.weapons?.length);
  assert.ok(
    data.weapons.some(
      (item) =>
        item.key === weaponKey && item.refinement === Number(editedRank),
    ),
  );
  assert.equal(data.characters?.length, 1);
  const [character] = data.characters!;
  assert.deepEqual(character.talent, { auto: 7, skill: 8, burst: 9 });
  assert.equal(character.constellation, 2);
  assert.ok(
    [...data.weapons, ...data.artifacts].some(
      (item) => item.location && item.location !== character.key,
    ),
  );
  console.log("Exported mixed inventory", {
    artifacts: data.artifacts.length,
    weapons: data.weapons.length,
    characters: data.characters?.length,
  });
}

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
    const favicon = await page
      .locator('link[rel="icon"][type="image/svg+xml"]')
      .getAttribute("href");
    assert.ok(favicon);
    const iconUrl = new URL(favicon, base);
    assert.equal(iconUrl.pathname, "/scanner/icon.svg");
    const headerIcon = await page
      .locator("header img")
      .evaluate(async (img: HTMLImageElement) => {
        await img.decode();
        return img.currentSrc;
      });
    assert.equal(headerIcon, iconUrl.href);
    const header = page.getByRole("banner");
    for (const [name, href] of [
      ["Genshin Impact", "https://genshin.hoyoverse.com/en/"],
      ["Genshin Optimizer", "https://frzyc.github.io/genshin-optimizer/"],
    ]) {
      const link = header.getByRole("link", { name, exact: true });
      assert.equal(await link.getAttribute("href"), href);
      assert.equal(await link.getAttribute("target"), "_blank");
    }
    const footer = page.getByRole("contentinfo");
    assert.ok(
      (await footer.innerText()).includes(
        "© 2026 Genshin Scanner contributors",
      ),
    );
    assert.equal(
      await footer.getByRole("link", { name: "GitHub" }).getAttribute("href"),
      "https://github.com/Genshin-Scanner/genshin-scanner-web",
    );
    const licenseLink = footer.getByRole("link", { name: "MIT License" });
    const licenseUrl = await licenseLink.evaluate(
      (link: HTMLAnchorElement) => link.href,
    );
    assert.equal(
      new URL(licenseUrl).pathname,
      "/scanner/ocr/LICENSE-Genshin-Scanner.txt",
    );
    const licenseResponse = await page.request.get(licenseUrl);
    assert.ok(licenseResponse.ok());
    assert.equal(
      await licenseResponse.text(),
      await readFile("LICENSE", "utf8"),
    );
    const language = page.getByRole("combobox", { name: "Interface language" });
    await language.selectOption("ru");
    await footer.getByRole("link", { name: "Лицензия MIT" }).waitFor();
    await page
      .getByRole("heading", { name: "Сканирование оружия и артефактов" })
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
    const help = page.getByRole("button", {
      name: "How do I use the GOOD file?",
    });
    const importHint = page.getByText(
      "Import the GOOD file into Genshin Optimizer.",
      {
        exact: false,
      },
    );
    await importHint.waitFor({ state: "hidden" });
    await help.press("Enter");
    await importHint.waitFor({ state: "visible" });
    assert.equal(
      await page
        .getByRole("link", { name: "Open Genshin Optimizer" })
        .getAttribute("href"),
      "https://frzyc.github.io/genshin-optimizer/",
    );
    await help.press("Escape");
    await importHint.waitFor({ state: "hidden" });
    const originalViewport = page.viewportSize()!;
    await page.setViewportSize({ width: 320, height: 700 });
    await language.selectOption("ru");
    const russianHelp = page.getByRole("button", {
      name: "Как использовать файл GOOD?",
    });
    await russianHelp.click();
    const panelBounds = await page
      .locator("[popover]:popover-open")
      .boundingBox();
    assert.ok(
      panelBounds &&
        panelBounds.x >= 0 &&
        panelBounds.x + panelBounds.width <= 320,
    );
    await page.keyboard.press("Escape");
    await page.getByLabel("Язык интерфейса").selectOption("en");
    await page.setViewportSize(originalViewport);
    if (mixed) {
      await checkMixedInventory(page);
    } else {
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
      assert.equal(
        report.items.filter(
          (item: { kind: string }) => item.kind === "artifact",
        ).length,
        count,
      );
      assert.equal(report.format, "genshin-scanner-review");
      assert.equal(report.version, 2);
      await page.getByRole("button", { name: "Weapons", exact: true }).click();
      for (let i = 0; i < (await tiles.count()); i++) {
        await page.locator('nav button[data-order="' + i + '"]').click();
        await page
          .getByRole("button", { name: "Exclude weapon", exact: true })
          .click();
      }
      await page
        .getByRole("button", { name: "Artifacts", exact: true })
        .click();
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
        await page
          .getByRole("heading", { name: "Свойства артефакта" })
          .waitFor();
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
        await page
          .getByLabel("Level", { exact: true })
          .fill(String(card.level));
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
      const owners = await openCharacters(page);
      for (const owner of await owners.all()) {
        await owner.click();
        await page
          .getByRole("checkbox", { name: "Exclude character settings" })
          .check();
      }
      const data = await downloadGood(page);
      assert.ok(data.artifacts);
      assert.equal(data.weapons, undefined);
      assert.equal(data.characters, undefined);
      assert.equal(data.artifacts.length, expected.length);
      for (const [i, artifact] of expected.entries()) {
        assert.deepEqual(
          data.artifacts[i],
          artifact,
          "Reference mismatch on item " + (i + 1),
        );
      }
      console.log("Exported", data.artifacts.length, "reviewed artifacts");
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
} finally {
  await host.close();
}
