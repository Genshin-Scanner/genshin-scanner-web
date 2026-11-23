import { expect, test } from "bun:test";
import {
  downloadData,
  edited,
  scanReport,
  type Row,
} from "../apps/web/src/review";
const row: Row = {
  draft: {},
  issues: ["level"],
  time: 0,
  image: "",
  detail: "",
  excluded: false,
};
test("review blocks unresolved readings and permits explicit exclusion", () => {
  expect(() => downloadData([row])).toThrow();
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
    downloadData([fixed, { ...row, excluded: true }]).artifacts,
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
  expect(scanReport([corrected])).toEqual({
    format: "genshin-scanner-review",
    version: 1,
    items: [
      {
        number: 1,
        time: 1.5,
        draft: {},
        issues: ["level"],
        unsupportedOwner: undefined,
      },
    ],
  });
  expect(() => downloadData([corrected])).toThrow();
});
