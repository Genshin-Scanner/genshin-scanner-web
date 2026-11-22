import { expect, test } from "bun:test";
import {
  exportGood,
  artifactIssuePaths,
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
  ).toContain("unactivatedSubstats");
});
test("rejects upgraded substats on a level zero artifact", () => {
  expect(
    validateArtifact({
      ...sands,
      rarity: 5,
      substats: [
        { key: "critRate_", value: 23.3 },
        { key: "critDMG_", value: 46.6 },
        { key: "atk", value: 117 },
      ],
    }),
  ).toContain("substats");
});

test("review identifies the exact substat control or a group-wide issue", () => {
  expect(
    artifactIssuePaths({
      ...sands,
      substats: [sands.substats[0], { key: "enerRech_", value: 999 }],
    }),
  ).toEqual(["substats.1.value"]);
  expect(
    artifactIssuePaths({
      ...sands,
      unactivatedSubstats: [{ key: "def", value: 17 }],
    }),
  ).toEqual(["unactivatedSubstats.0.key"]);
  expect(artifactIssuePaths({ ...sands, substats: [] })).toContain("substats");
  expect(artifactIssuePaths({ ...sands, location: undefined })).toEqual([
    "location",
  ]);
  expect(artifactIssuePaths(sands)).toEqual([]);
});
