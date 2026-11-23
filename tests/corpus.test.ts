import { expect, test } from "bun:test";
import { compare } from "../scripts/corpus/compare";
import type { Artifact } from "../packages/good/src";
const flower: Artifact = {
  setKey: "TheExile",
  slotKey: "flower",
  mainStatKey: "hp",
  level: 0,
  rarity: 4,
  location: "",
  lock: false,
  substats: [
    { key: "atk", value: 14 },
    { key: "def", value: 17 },
  ],
  unactivatedSubstats: [],
};

test("raw corpus comparison preserves identical artifacts and reports each erroneous field", () => {
  const expected = [flower, flower, { ...flower, lock: true }];
  const items = expected.map((draft, time) => ({
    draft,
    issues: [] as string[],
    time,
  }));
  expect(compare(items, expected)).toMatchObject({
    exact: 3,
    extra: [],
    missing: [],
    falseAccepts: 0,
  });
  const wrong = [
    items[0],
    { ...items[2], draft: { ...items[2].draft, level: 4 } },
  ];
  const result = compare(wrong, expected);
  expect(result.missing).toHaveLength(1);
  expect(result.falseAccepts).toBe(1);
  expect(result.mismatches).toMatchObject([
    { expectedIndex: 3, fields: ["level"] },
  ]);
  expect(compare([...items, items[2]], expected).extra).toHaveLength(1);
});
