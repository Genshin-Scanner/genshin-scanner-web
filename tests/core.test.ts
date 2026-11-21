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
