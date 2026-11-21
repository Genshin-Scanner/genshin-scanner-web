import { expect, test } from "bun:test";
import { downloadData, edited, type Row } from "../apps/web/src/review";
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
