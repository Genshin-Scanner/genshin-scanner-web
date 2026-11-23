import { expect, test } from "bun:test";
import {
  exportInventoryGood,
  validateWeapon,
  validateCharacter,
  type Artifact,
  type Weapon,
} from "../packages/good/src";
import {
  createOwnerResolver,
  InventorySegmentDetector,
  inventoryKind,
  markInventoryFrame,
  parseWeaponReadings,
  SegmentDetector,
  type Mark,
  type Pixels,
} from "../packages/core/src";
import {
  characterEntries,
  editedWeapon,
  inventoryDownloadData,
  inventoryReviewRows,
  inventoryScanReport,
  type InventoryRow,
  type WeaponRow,
} from "../apps/web/src/review";

const bow: Weapon = {
  key: "RavenBow",
  level: 80,
  ascension: 6,
  refinement: 5,
  location: "Amber",
  lock: true,
};
const artifact: Artifact = {
  setKey: "TheExile",
  slotKey: "flower",
  rarity: 4,
  level: 0,
  mainStatKey: "hp",
  lock: false,
  location: "Amber",
  substats: [
    { key: "atk", value: 14 },
    { key: "def", value: 17 },
  ],
  unactivatedSubstats: [],
};
const evidence = {
  time: 1,
  image: "",
  detail: "",
  excluded: false,
  issues: [],
};
const weaponRow: WeaponRow = { ...evidence, kind: "weapon", draft: bow };
const artifactRow: InventoryRow = {
  ...evidence,
  kind: "artifact",
  draft: artifact,
};

test("parses weapon level cap and refinement, and preserves custom Manekin evidence", () => {
  const owner = createOwnerResolver({ Manekin: "Doll" });
  const raw = {
    name: "Raven Bow",
    type: "Bow",
    level: "80/90",
    refinement: "5 Refinement Rank 5",
    equipped: "Equipped: Amber",
  };
  expect(parseWeaponReadings(raw, 3, true, owner)).toMatchObject({
    draft: bow,
    issues: [],
  });
  expect(
    parseWeaponReadings({ ...raw, level: "80/80" }, 3, true, owner).draft
      .ascension,
  ).toBe(5);
  expect(
    parseWeaponReadings({ ...raw, name: "Raven Bow" }, 4, true, owner).issues,
  ).toContain("key");
  expect(
    parseWeaponReadings(
      { ...raw, refinement: "4 Refinement Rank 5" },
      3,
      true,
      owner,
    ).issues,
  ).toContain("refinement");
  expect(
    parseWeaponReadings(
      { ...raw, equipped: "Equipped: Doll" },
      3,
      false,
      owner,
    ),
  ).toMatchObject({
    unsupportedOwner: "Manekin",
    draft: { lock: false },
    issues: ["location"],
  });
  expect(
    parseWeaponReadings({ ...raw, equipped: undefined }, 3, false, owner).draft
      .location,
  ).toBe("");
  expect(validateWeapon({ ...bow, location: "Traveler" })).toContain(
    "location",
  );
  expect(validateWeapon({ ...bow, level: 81, ascension: 5 })).toContain(
    "ascension",
  );
});

test("mixed export keeps item ownership when character settings are excluded", () => {
  const rows = [weaponRow, artifactRow];
  expect(
    characterEntries(rows, {}).map(({ owner, excluded }) => [owner, excluded]),
  ).toEqual([["Amber", false]]);
  expect(() => inventoryDownloadData(rows, {})).toThrow();
  const amber = {
    key: "Amber",
    level: 90,
    ascension: 6,
    constellation: 0,
    talent: { auto: 1, skill: 8, burst: 10 },
  } as const;
  expect(
    inventoryDownloadData(rows, { Amber: { draft: amber, excluded: false } }),
  ).toMatchObject({
    weapons: [bow],
    artifacts: [artifact],
    characters: [amber],
  });
  const withoutConfig = inventoryDownloadData(rows, {
    Amber: { draft: {}, excluded: true },
  });
  expect(withoutConfig.characters).toBeUndefined();
  expect(withoutConfig.artifacts?.[0].location).toBe("Amber");
  expect(withoutConfig.weapons?.[0].location).toBe("Amber");
  expect(characterEntries([{ ...weaponRow, excluded: true }], {})).toEqual([]);
  expect(() =>
    exportInventoryGood({ weapons: [{ ...bow, refinement: undefined }] }),
  ).toThrow();
  expect(
    validateCharacter({ ...amber, talent: { ...amber.talent, auto: 13 } }),
  ).toContain("talent.auto");
  expect(validateCharacter({ ...amber, level: 95 })).toEqual([]);
  expect(validateCharacter({ ...amber, level: 96 })).toContain("ascension");
  expect(
    characterEntries(
      [{ ...artifactRow, draft: { ...artifact, location: "Traveler" } }],
      {},
    )[0].issues,
  ).toContain("key");
  expect(
    exportInventoryGood({ characters: [{ ...amber, key: "TravelerGeo" }] })
      .characters?.[0]?.key,
  ).toBe("TravelerGeo");
});

test("review flags competing weapon owners and retains both unequipped copies", () => {
  const duplicate = { ...weaponRow, time: 2 };
  expect(
    inventoryReviewRows([weaponRow, duplicate]).map((row) => row.issues),
  ).toEqual([["locationConflict"], ["locationConflict"]]);
  expect(
    inventoryReviewRows([weaponRow, { ...duplicate, excluded: true }]).map(
      (row) => row.issues,
    ),
  ).toEqual([[], []]);
  const draft = { ...bow, location: "" } as const;
  const copies = [
    editedWeapon(weaponRow, draft),
    editedWeapon(duplicate, draft),
  ];
  expect(inventoryDownloadData(copies, {}).weapons).toEqual([draft, draft]);
  expect(
    inventoryScanReport(copies).items.map((item) => [
      item.kind,
      item.time,
      item.draft.location,
    ]),
  ).toEqual([
    ["weapon", 1, "Amber"],
    ["weapon", 2, "Amber"],
  ]);
});

function mark(
  kind: Mark["kind"],
  column: number,
  center: number,
  offset = 0,
): Mark {
  return {
    kind,
    selection: { column, center },
    rarity: 4,
    values: new Uint8Array(80).fill(80),
    grid: new Uint8Array(25).fill(offset),
    quality: 5,
  };
}

test("identical weapon cards split on a stable column or row change and at a tab switch", () => {
  const a = mark("weapon", 1, 0.5),
    b = mark("weapon", 2, 0.5),
    c = mark("weapon", 2, 0.86),
    art = mark("artifact", 2, 0.86);
  const detector = new SegmentDetector();
  const segments = [a, a, b, a, b, b, c, c, art, art].flatMap((frame, i) => {
    const item = detector.push(i / 10, frame);
    return item ? [item] : [];
  });
  expect(
    [...segments, detector.flush()].map((segment) => [
      segment?.kind,
      segment?.start,
    ]),
  ).toEqual([
    ["weapon", 0],
    ["weapon", 0.4],
    ["weapon", 0.6],
    ["artifact", 0.8],
  ]);
});

test("a scroll moves an identical weapon without adding a duplicate selection", () => {
  const still = mark("weapon", 1, 0.8),
    scrolled = mark("weapon", 1, 0.45, 80);
  const next = mark("weapon", 2, 0.45, 80);
  const detector = new SegmentDetector();
  const results = [
    still,
    still,
    scrolled,
    scrolled,
    scrolled,
    next,
    next,
  ].flatMap((frame, i) => {
    const item = detector.push(i / 10, frame);
    return item ? [item.start] : [];
  });
  expect([...results, detector.flush()?.start]).toEqual([0, 0.5]);
});

test("weapon OCR uses the center of the selection even when the last frame has stronger contrast", () => {
  const still = mark("weapon", 1, 0.5);
  const detector = new SegmentDetector();
  for (const [i, quality] of [1, 1, 1, 20].entries()) {
    detector.push(i / 10, { ...still, quality });
  }
  expect(detector.flush()?.time).toBeCloseTo(0.15);
});

test("only the active inventory underline classifies a frame", () => {
  const image: Pixels = {
    width: 960,
    height: 600,
    data: new Uint8Array(960 * 600 * 4),
  };
  function underline(x: number, rgb: number[]) {
    for (let dx = -22; dx < 22; dx++)
      image.data.set([...rgb, 255], (46 * 960 + x + dx) * 4);
  }
  expect(inventoryKind(image)).toBeUndefined();
  underline(288, [212, 187, 138]);
  expect(inventoryKind(image)).toBe("weapon");
  underline(336, [212, 187, 138]);
  expect(inventoryKind(image)).toBeUndefined();
  underline(288, [0, 0, 0]);
  expect(inventoryKind(image)).toBe("artifact");
});

test("switching briefly to weapons and back retains the same displayed artifact once", () => {
  const detector = new InventorySegmentDetector();
  const artifact = mark("artifact", 0, 0);
  const weapon = mark("weapon", 0, 0);
  const result = [
    artifact,
    artifact,
    weapon,
    weapon,
    weapon,
    artifact,
    artifact,
  ]
    .flatMap((entry, index) => detector.push(index / 10, entry))
    .concat(detector.flush());
  expect(result.map((segment) => segment.kind)).toEqual(["artifact", "weapon"]);
});

test("low-rarity weapon panels yield a rarity marker for the skip counter", () => {
  for (const [rarity, title] of [
    [1, [130, 133, 139]],
    [2, [53, 124, 89]],
  ] as const) {
    const image: Pixels = {
      width: 960,
      height: 600,
      data: new Uint8Array(960 * 600 * 4),
    };
    function fill(
      x: number,
      y: number,
      width: number,
      height: number,
      color: readonly number[],
    ) {
      for (let dy = 0; dy < height; dy++)
        for (let dx = 0; dx < width; dx++)
          image.data.set([...color, 255], ((y + dy) * 960 + x + dx) * 4);
    }
    fill(267, 46, 42, 2, [212, 187, 138]);
    fill(654, 60, 246, 28, title);
    fill(654, 202, 246, 260, [234, 227, 216]);
    for (let i = 0; i < rarity; i++)
      fill(669 + i * 17, 185, 13, 7, [246, 208, 70]);
    expect(markInventoryFrame(image)).toMatchObject({ kind: "weapon", rarity });
  }
});
