import {
  levelCaps,
  validateWeapon,
  weaponData,
  allWeaponKeys,
  type WeaponDraft,
} from "@scanner/good";
import { createOwnerResolver, lookup, type CustomOwnerNames } from "./english";
import type { Ocr } from "./index";
import { locateInventoryPanel } from "./layout";
import { bands, crop, matches, type Pixels } from "./pixels";

export type InventoryKind = "artifact" | "weapon";

export function inventoryKind(image: Pixels): InventoryKind | undefined {
  const { width } = image;
  const gold = (r: number, g: number, b: number) =>
    r > 165 && g > 130 && b > 75 && r - g > 9 && g - b > 22 && g - b < 85;
  const candidates = new Set<InventoryKind>();
  for (let y = Math.round(width * 0.04); y <= width * 0.056; y++) {
    for (const [left, right] of bands(
      Math.round(width * 0.248),
      Math.round(width * 0.418),
      (x) => matches(image, x, y, gold),
      Math.round(width * 0.03),
    )) {
      if (right - left > width * 0.068) continue;
      const center = (left + right) / (2 * width);
      if (center >= 0.275 && center < 0.335) candidates.add("weapon");
      if (center >= 0.335 && center <= 0.387) candidates.add("artifact");
    }
  }
  if (candidates.size === 1) return candidates.values().next().value;
}

export function locateWeapon(frame: Pixels) {
  const panel = locateInventoryPanel(frame, true);
  if (!panel) return;
  const { x, width, right, bodyY, bodyEnd, rarity } = panel;
  const rect = (left: number, top: number, w: number, h: number) => ({
    x: x + left * width,
    y: bodyY + top * width,
    width: w * width,
    height: h * width,
  });
  const badge = [0.063, 0.105, 0.109]
    .flatMap((top) =>
      bands(
        Math.round(x + width * 0.044),
        Math.round(x + width * 0.33),
        (i) =>
          matches(
            frame,
            i,
            Math.round(bodyY + width * top),
            (r, g, b) => r < 105 && g < 115 && b < 125,
          ),
        width * 0.16,
      ),
    )
    .sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
  // Leave room past the last digit when compression breaks the dark badge edge.
  const level = badge
    ? {
        ...rect(0, 0.049, 0, 0.067),
        x: badge[0],
        width: badge[1] - badge[0] + width * 0.01,
      }
    : rect(0.057, 0.049, 0.271, 0.067);
  const equipped = bands(
    bodyY + Math.round(width * 0.12),
    frame.height,
    (y) =>
      [0.025, 0.15].every((offset) =>
        matches(
          frame,
          right - width * offset,
          y,
          (r, g, b) => r > 241 && g > 208 && g < 242 && b > 150 && b < 205,
        ),
      ),
    Math.ceil(width * 0.075),
  ).at(-1);
  const lockRegion = rect(0.86, 0.038, 0.09, 0.08);
  let locked = 0,
    unlocked = 0;
  for (
    let y = Math.round(lockRegion.y);
    y < lockRegion.y + lockRegion.height;
    y++
  ) {
    for (
      let i = Math.round(lockRegion.x);
      i < lockRegion.x + lockRegion.width;
      i++
    ) {
      if (
        matches(
          frame,
          i,
          y,
          (r, g, b) => r > 190 && r > g * 1.4 && r > b * 1.45,
        )
      )
        locked++;
      if (
        matches(
          frame,
          i,
          y,
          (r, g, b) =>
            r > 105 && r < 177 && g > r + 1 && b > g + 2 && b < r + 42,
        )
      )
        unlocked++;
    }
  }
  const threshold = width * width * 0.00024;
  return {
    rarity,
    card: rect(0, -0.575, 1, (bodyEnd - bodyY) / width + 0.575),
    name: rect(0.045, -0.576, 0.945, 0.115),
    type: rect(0.055, -0.441, 0.42, 0.058),
    level,
    refinement: rect(0.054, 0.134, 0.61, 0.075),
    thumbnail: rect(0.5, -0.46, 0.49, 0.45),
    lock:
      locked >= threshold ? true : unlocked >= threshold ? false : undefined,
    lockRegion,
    equipped: equipped
      ? rect(
          0.15,
          (equipped[0] - bodyY) / width,
          0.84,
          (equipped[1] - equipped[0]) / width,
        )
      : undefined,
  };
}

const weaponTypes = [
  "Sword",
  "Claymore",
  "Polearm",
  "Bow",
  "Catalyst",
] as const;

export interface WeaponReadings {
  name: string;
  type: string;
  level: string;
  refinement: string;
  equipped?: string;
}

type OwnerResolver = ReturnType<typeof createOwnerResolver>;

export function parseWeaponReadings(
  readings: WeaponReadings,
  rarity: number,
  lock: boolean | undefined,
  resolveOwner: OwnerResolver = createOwnerResolver(),
) {
  const type = lookup(readings.type, weaponTypes)?.toLowerCase();
  const candidates = allWeaponKeys.filter(
    (key) =>
      weaponData[key].rarity === rarity &&
      (!type || weaponData[key].type === type),
  );
  const key = lookup(readings.name, candidates, (key) => weaponData[key].name);
  const match = readings.level
    .trim()
    .match(/^(?:Lv[. ]*)?\s*(\d{1,2})\s*\/\s*(\d{2})$/i);
  const level = match ? Number(match[1]) : undefined;
  const cap = match ? Number(match[2]) : undefined;
  const ascension = levelCaps.findIndex((value) => value === cap);
  const refinement = readings.refinement
    .trim()
    .match(/^(?:([1-5])\s+)?(?:Refinement\s+Rank\s*)?([1-5])$/i);
  const rank =
    refinement && (!refinement[1] || refinement[1] === refinement[2])
      ? Number(refinement[2])
      : undefined;
  const owner =
    readings.equipped === undefined ? "" : resolveOwner(readings.equipped);
  const draft: WeaponDraft = {
    key,
    level,
    ascension:
      ascension >= 0 ? (ascension as WeaponDraft["ascension"]) : undefined,
    refinement: rank as WeaponDraft["refinement"],
    location: owner === "Manekin" ? undefined : owner,
    lock,
  };
  return {
    draft,
    issues: validateWeapon(draft),
    unsupportedOwner: owner === "Manekin" ? owner : undefined,
  };
}

export async function recognizeWeapon(
  frame: Pixels,
  read: Ocr,
  names: CustomOwnerNames = {},
) {
  if (inventoryKind(frame) !== "weapon") return;
  const layout = locateWeapon(frame);
  if (!layout || layout.rarity < 3 || layout.rarity > 5) return;
  const { name, type, level, refinement, equipped } = layout;
  const text: WeaponReadings = {
    name: await read(crop(frame, name), "weaponTitle"),
    type: await read(crop(frame, type), "headerLine"),
    level: await read(crop(frame, level), "weaponLevel"),
    refinement: await read(crop(frame, refinement), "weaponRefinement"),
    equipped: equipped && (await read(crop(frame, equipped), "equipped")),
  };
  const resolveOwner = createOwnerResolver(names);
  if (equipped && !resolveOwner(text.equipped!)) {
    const alternate = await read(crop(frame, equipped), "ownerLine");
    if (resolveOwner(alternate)) text.equipped = alternate;
  }
  return {
    ...parseWeaponReadings(text, layout.rarity, layout.lock, resolveOwner),
    layout,
    text,
  };
}
