import { expect, test } from "bun:test";
import {
  inventoryDownloadData,
  edited,
  inventoryScanReport,
  type InventoryRow,
} from "../apps/web/src/review";
const row: Extract<InventoryRow, { kind: "artifact" }> = {
  kind: "artifact",
  draft: {},
  issues: ["level"],
  time: 0,
  image: "",
  detail: "",
  excluded: false,
};
test("review blocks unresolved readings and permits explicit exclusion", () => {
  expect(() => inventoryDownloadData([row], {})).toThrow();
  const fixed = edited(row, {
    level: 0,
    rarity: 4,
    slotKey: "flower",
    mainStatKey: "hp",
    setKey: "TheExile",
    location: "",
    lock: false,
    substats: [
      { key: "atk", value: 14 },
      { key: "def", value: 17 },
    ],
  });
  expect(
    inventoryDownloadData([fixed, { ...row, excluded: true }], {}).artifacts,
  ).toHaveLength(1);
});

test("diagnostics preserve raw values even after correction and never embed the recording previews", () => {
  const initial = {
    ...row,
    time: 1.5,
    image: "private thumbnail",
    detail: "private panel",
  };
  const corrected = edited(edited(initial, { level: 4 }), { level: 8 });
  expect(inventoryScanReport([corrected])).toEqual({
    format: "genshin-scanner-review",
    version: 2,
    items: [
      {
        number: 1,
        kind: "artifact",
        time: 1.5,
        draft: {},
        issues: ["level"],
        unsupportedOwner: undefined,
      },
    ],
  });
  expect(() => inventoryDownloadData([corrected], {})).toThrow();
});
