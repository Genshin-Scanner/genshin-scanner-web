import {
  allArtifactSetKeys,
  allLocationCharacterKeys,
  allSubstatKeys,
  artSlotMainKeys,
  type Artifact,
} from "@scanner/good";
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
  level: string;
  stats: string;
  set: string;
  equipped?: string;
}
export interface LocaleProfile {
  language: string;
  parse: (text: Readings) => Partial<Artifact>;
}
export const english: LocaleProfile = {
  language: "eng",
  parse(t) {
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
    const percent = t.header.includes("%");
    const mainStatKey = lines
      .map((s) =>
        lookup(
          s,
          candidates.filter((k) => k.endsWith("_") === percent),
          (k) => labels[k],
        ),
      )
      .find(Boolean);
    const levelText = t.level.trim().replace(/^\+\s*/, "");
    const level = /^\d{1,2}$/.test(levelText) ? Number(levelText) : undefined;
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
    const location =
      t.equipped === undefined
        ? ""
        : lookup(
            t.equipped.replace(/^.*?equipped\s*[:.]?\s*/i, ""),
            allLocationCharacterKeys,
          );
    return {
      setKey: lookup(t.set, allArtifactSetKeys),
      slotKey,
      mainStatKey,
      level,
      location,
      substats,
      unactivatedSubstats,
    };
  },
};
