import {
  allArtifactSetKeys,
  allLocationCharacterKeys,
  allSubstatKeys,
  artSlotMainKeys,
  displayMainValue,
  type Artifact,
} from "@scanner/good";
import type { Ocr } from "./index";
import { crop, type Pixels } from "./pixels";
import { statNumber } from "./stat-digits";

export const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");
function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 0; i < a.length; i++) {
    const row = [i + 1];
    for (let j = 0; j < b.length; j++)
      row.push(
        Math.min(row[j] + 1, prev[j + 1] + 1, prev[j] + Number(a[i] !== b[j])),
      );
    prev = row;
  }
  return prev[b.length];
}
function lookup<K extends string>(
  raw: string,
  entries: readonly K[],
  label: (key: K) => string = (key) => key,
): K | undefined {
  const s = normalize(raw);
  if (!s) return;
  const ranked = entries
    .map((key) => ({ key, d: distance(normalize(label(key)), s) }))
    .sort((a, b) => a.d - b.d);
  if (
    ranked[0] &&
    ranked[0].d <= Math.floor(s.length * 0.18) &&
    ranked[0].d !== ranked[1]?.d
  )
    return ranked[0].key;
}
const slotNames = {
  flower: "Flower of Life",
  plume: "Plume of Death",
  sands: "Sands of Eon",
  goblet: "Goblet of Eonothem",
  circlet: "Circlet of Logos",
};
const labels: Record<string, string> = {
  hp: "HP",
  hp_: "HP",
  atk: "ATK",
  atk_: "ATK",
  def: "DEF",
  def_: "DEF",
  eleMas: "Elemental Mastery",
  enerRech_: "Energy Recharge",
  critRate_: "CRIT Rate",
  critDMG_: "CRIT DMG",
  heal_: "Healing Bonus",
};
for (const element of [
  "Physical",
  "Anemo",
  "Geo",
  "Electro",
  "Hydro",
  "Pyro",
  "Cryo",
  "Dendro",
])
  labels[element.toLowerCase() + "_dmg_"] = element + " DMG Bonus";
export interface Readings {
  header: string;
  mainValue?: string;
  level: string;
  stats: string;
  set: string;
  equipped?: string;
}
export interface LocaleProfile {
  language: string;
  readStatLine?: (line: Pixels, read: Ocr) => Promise<string>;
  parse: (
    text: Readings,
    rarity?: number,
  ) => Partial<Artifact> & { unsupportedOwner?: "Manekin" };
}
export const customOwnerKeys = ["Traveler", "Wanderer", "Manekin"] as const;
export type CustomOwnerNames = Partial<
  Record<(typeof customOwnerKeys)[number], string>
>;
type Owner = Exclude<Artifact["location"], ""> | "Manekin";

function ownerName(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
}

export function createEnglishProfile(
  names: CustomOwnerNames = {},
): LocaleProfile {
  const owners = new Map<string, Set<Owner>>();

  function addName(name: string, key: Owner) {
    const normalized = ownerName(name);
    if (!normalized) return;
    const matches = owners.get(normalized) ?? new Set<Owner>();
    matches.add(key);
    owners.set(normalized, matches);
  }

  for (const key of allLocationCharacterKeys) addName(key, key);
  addName("Manekin", "Manekin");
  addName("Manekina", "Manekin");
  for (const key of customOwnerKeys) addName(names[key] ?? "", key);

  function resolveOwner(equipped: string) {
    const name = ownerName(equipped.replace(/^.*?equipped\s*[:.]?\s*/i, ""));
    if (!name) return;
    let matches = owners.get(name);
    if (!matches) {
      let best = Math.floor(name.length * 0.18);
      matches = new Set<Owner>();
      for (const [candidate, keys] of owners) {
        if (Math.abs(candidate.length - name.length) > best) continue;
        const score = distance(name, candidate);
        if (score > best) continue;
        if (score < best) matches.clear();
        best = score;
        for (const key of keys) matches.add(key);
      }
    }
    return matches.size === 1 ? matches.values().next().value : undefined;
  }

  return {
    language: "eng",
    async readStatLine(line, read) {
      const suffix = statNumber(line);
      if (!suffix) return read(line, "statLine");
      const label = crop(line, {
        x: 0,
        y: 0,
        width: suffix.labelWidth,
        height: line.height,
      });
      return (await read(label, "statLine")).trim() + "+" + suffix.value;
    },
    parse(t, rarity) {
      const lines = t.header
        .trim()
        .split(/\n+/)
        .map((s) => s.trim());
      const slotKey = lines
        .map((s) =>
          lookup(
            s,
            Object.keys(slotNames) as (keyof typeof slotNames)[],
            (k) => slotNames[k],
          ),
        )
        .find(Boolean);
      const candidates = slotKey ? artSlotMainKeys[slotKey] : [];
      const amountReadings = [t.mainValue?.trim() ?? "", ...lines].filter((s) =>
        /^[\d,]+(?:\.\d+)?%?$/.test(s),
      );
      const percent = amountReadings.some((s) => s.endsWith("%"));
      const mainStatKey = lines
        .map((s) =>
          lookup(
            s,
            candidates.filter((k) => k.endsWith("_") === percent),
            (k) => labels[k],
          ),
        )
        .find(Boolean);
      const elementalKey = candidates.find(
        (k) =>
          k.endsWith("_dmg_") &&
          lines.some((line) =>
            normalize(line).startsWith(
              normalize(labels[k]).replace(/bonus$/, ""),
            ),
          ),
      );
      const resolvedMain = mainStatKey ?? elementalKey;
      const levelText = t.level.trim().replace(/^\+\s*/, "");
      let level = /^\d{1,2}$/.test(levelText) ? Number(levelText) : undefined;
      if (resolvedMain && (rarity === 4 || rarity === 5)) {
        const observed = amountReadings.map((s) =>
          Number(s.replace(/[,%]/g, "")),
        );
        const possible = Array.from(
          { length: rarity === 5 ? 21 : 17 },
          (_, i) => i,
        ).filter((i) =>
          observed.some((n) => n === displayMainValue(rarity, resolvedMain, i)),
        );
        if (level === undefined && possible.length === 1) level = possible[0];
        else if (level !== undefined && !possible.includes(level))
          level = undefined;
      }
      const substats: Artifact["substats"] = [],
        unactivatedSubstats: Artifact["substats"] = [];
      for (const line of t.stats.trim().split(/\n+/)) {
        const match = line.match(
          /^\s*[^a-zA-Z]*([a-zA-Z ]+?)\s*\+\s*([\d,]+(?:\.\d+)?)\s*(%)?\s*(.*?)\s*$/,
        );
        if (!match) {
          substats.push({ key: "", value: 0 });
          continue;
        }
        const key = lookup(
          match[1],
          allSubstatKeys.filter((k) => k.endsWith("_") === !!match[3]),
          (k) => labels[k],
        );
        const inactive = normalize(match[4]) === "unactivated";
        (inactive ? unactivatedSubstats : substats).push({
          key: key && (!match[4] || inactive) ? key : "",
          value: Number(match[2].replaceAll(",", "")),
        });
      }
      const owner = t.equipped === undefined ? "" : resolveOwner(t.equipped);
      return {
        setKey: lookup(t.set, allArtifactSetKeys),
        slotKey,
        mainStatKey: resolvedMain,
        level,
        location: owner === "Manekin" ? undefined : owner,
        ...(owner === "Manekin" && { unsupportedOwner: owner }),
        substats,
        unactivatedSubstats,
      };
    },
  };
}

export const english = createEnglishProfile();
