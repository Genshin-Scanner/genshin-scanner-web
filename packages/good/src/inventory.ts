import { z } from "zod";
import { characterWeaponTypes } from "./upstream/character-weapon-types";
import {
  allLocationCharacterKeys,
  nonTravelerCharacterKeys,
} from "./upstream/locations";
import { travelerKeys } from "./upstream/traveler-keys";
import { weaponData } from "./upstream/weapon-data";

export { travelerKeys, weaponData };
export type OwnerKey = (typeof allLocationCharacterKeys)[number];
export type WeaponKey = keyof typeof weaponData;
export const allWeaponKeys = Object.keys(weaponData) as WeaponKey[];
export const allCharacterKeys = [
  ...nonTravelerCharacterKeys,
  ...travelerKeys,
] as const;
export const levelCaps = [20, 40, 50, 60, 70, 80, 90] as const;
export const talentLimits = [1, 1, 2, 4, 6, 8, 10] as const;
export const talentKeys = ["auto", "skill", "burst"] as const;

const ascensions = [0, 1, 2, 3, 4, 5, 6] as const;
const refinements = [1, 2, 3, 4, 5] as const;
const integer = (min: number, max: number) =>
  z.number().int().min(min).max(max);

// Strict input variants of the pinned Optimizer schemas. Missing scan results
// must go through review before Optimizer can apply its import defaults.
export const weaponSchema = z
  .object({
    key: z.enum(allWeaponKeys),
    level: integer(1, 90),
    ascension: z.literal(ascensions),
    refinement: z.literal(refinements),
    location: z.enum(["", ...allLocationCharacterKeys]),
    lock: z.boolean(),
  })
  .superRefine((weapon, ctx) => {
    const data = weaponData[weapon.key];
    if (data.rarity < 3)
      ctx.addIssue({
        code: "custom",
        path: ["key"],
        message: "Unsupported weapon rarity",
      });
    if (!validLevel(weapon.level, weapon.ascension))
      ctx.addIssue({
        code: "custom",
        path: ["ascension"],
        message: "Level does not match ascension",
      });
    if (
      weapon.location &&
      characterWeaponTypes[weapon.location] !== data.type
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["location"],
        message: "Weapon type does not match character",
      });
    }
  });

export const characterSchema = z
  .object({
    key: z.enum(allCharacterKeys),
    level: integer(1, 100),
    ascension: z.literal(ascensions),
    constellation: integer(0, 6),
    talent: z.object({
      auto: integer(1, 10),
      skill: integer(1, 10),
      burst: integer(1, 10),
    }),
  })
  .superRefine((character, ctx) => {
    const { level, ascension, talent } = character;
    if (
      !validLevel(level, ascension) &&
      !(ascension === 6 && (level === 95 || level === 100))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ascension"],
        message: "Level does not match ascension",
      });
    }
    for (const key of talentKeys) {
      if (talent[key] > talentLimits[ascension])
        ctx.addIssue({
          code: "custom",
          path: ["talent", key],
          message: "Talent exceeds ascension limit",
        });
    }
  });

function validLevel(level: number, ascension: number) {
  return (
    level >= (levelCaps[ascension - 1] ?? 1) && level <= levelCaps[ascension]
  );
}

export type Weapon = z.infer<typeof weaponSchema>;
export type Character = z.infer<typeof characterSchema>;
export type WeaponDraft = Partial<Weapon>;
export type CharacterDraft = Partial<Omit<Character, "talent">> & {
  talent?: Partial<Character["talent"]>;
};

export function validateWeapon(draft: WeaponDraft) {
  const result = weaponSchema.safeParse(draft);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

export function validateCharacter(draft: CharacterDraft) {
  const result = characterSchema.safeParse(draft);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}
