import { test, expect } from "bun:test";
import { bands, english, pcLayout } from "../packages/core/src";
test("band boundaries include the last active pixel", () =>
  expect(bands(0, 5, (i) => i >= 3)).toEqual([[3, 5]]));
test("ignores blank frames", () =>
  expect(
    pcLayout.locate({ width: 100, height: 50, data: new Uint8Array(20000) }),
  ).toBeUndefined());
test("keeps ambiguous levels and owners for review", () => {
  const draft = english.parse({
    header: "Plume of Death\nATK\n47",
    level: "+U",
    set: "Viridescent Venerer:",
    stats: "CRIT Rate+3.1%\nDEF+23 (unactivated)",
    equipped: "Equipped: my nickname",
  });
  expect(draft.level).toBeUndefined();
  expect(draft.location).toBeUndefined();
  expect(draft.unactivatedSubstats).toEqual([{ key: "def", value: 23 }]);
});
test("checks the displayed main value against the level", () => {
  const text = {
    header: "Flower of Life\nHP",
    mainValue: "4781",
    level: "+0",
    set: "The Exile",
    stats: "DEF+17",
  };
  expect(english.parse(text, 5).level).toBeUndefined();
});

test("attaches a wrapped unactivated marker to the preceding stat", async () => {
  const pixels = { width: 400, height: 56, data: new Uint8Array(400 * 56 * 4) };
  const stats = await english.readStatLine!(pixels, async (_, field) => {
    expect(field).toBe("stats");
    return "Elemental Mastery+16\n(unactivated)";
  });
  const draft = english.parse({ header: "", level: "+0", set: "", stats });
  expect(draft.substats).toEqual([]);
  expect(draft.unactivatedSubstats).toEqual([{ key: "eleMas", value: 16 }]);
});
test("an obscured bonus suffix can still identify a Cryo goblet", () => {
  const read = (label: string) =>
    english.parse(
      {
        header: "Goblet of Eonothem\n" + label,
        mainValue: "46.6%",
        level: "+20",
        stats: "",
        set: "",
      },
      5,
    );
  expect(read("Cryo DMG Boe").mainStatKey).toBe("cryo_dmg_");
  expect(read("DMG Bonus").mainStatKey).toBeUndefined();
  expect(read("ryo DMG").mainStatKey).toBeUndefined();
});
test("wrapped titles and an elixir banner preserve the full panel and both set-name lines", () => {
  const width = 800,
    height = 500;
  function panel(banner: number) {
    const frame = { width, height, data: new Uint8Array(width * height * 4) };
    function fill(x: number, y: number, w: number, h: number, rgb: number[]) {
      for (let j = y; j < y + h; j++)
        for (let i = x; i < x + w; i++)
          frame.data.set([...rgb, 255], 4 * (j * width + i));
    }
    fill(543, 50, 157, 8, [165, 89, 31]);
    for (let i = 0; i < 5; i++) fill(515 + 14 * i, 140, 8, 6, [250, 196, 72]);
    fill(500, 160, 200, banner, [220, 190, 250]);
    fill(500, 160 + banner, 200, 230, [234, 227, 216]);
    for (const dy of [85, 98])
      fill(515, 160 + banner + dy, 110, 6, [96, 170, 80]);
    return pcLayout.locate(frame)!;
  }
  const ordinary = panel(0),
    crafted = panel(18);
  expect(crafted.rarity).toBe(5);
  expect(crafted.card.width).toBe(200);
  expect(crafted.mainLabel).toEqual(ordinary.mainLabel);
  expect(crafted.slotLabel).toEqual(ordinary.slotLabel);
  expect(crafted.level.y - ordinary.level.y).toBe(18);
  expect(crafted.set.height).toBeGreaterThan(19);
});
