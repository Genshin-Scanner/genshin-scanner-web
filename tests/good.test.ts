import { expect, test } from "bun:test";
import {
  exportGood,
  validateArtifact,
  type Artifact,
} from "../packages/good/src";
const sands: Artifact = {
  rarity: 4,
  level: 0,
  slotKey: "sands",
  mainStatKey: "def_",
  setKey: "ADayCarvedFromRisingWinds",
  substats: [
    { key: "def", value: 17 },
    { key: "enerRech_", value: 4.1 },
  ],
  lock: false,
  location: "",
};
test("exports a GOOD v3 artifact without changing its fields", () =>
  expect(exportGood([sands]).artifacts).toEqual([sands]));
test("missing readings cannot become upstream default values", () => {
  const { lock, ...draft } = sands;
  expect(validateArtifact(draft)).toContain("lock");
  expect(() => exportGood([draft])).toThrow();
});
test("guards main stat slot, rarity level, repeated and hidden stats", () => {
  expect(validateArtifact({ ...sands, level: 17 })).toContain("level");
  expect(validateArtifact({ ...sands, slotKey: "flower" })).toContain(
    "mainStatKey",
  );
  expect(
    validateArtifact({ ...sands, unactivatedSubstats: sands.substats }),
  ).toContain("substats");
});
