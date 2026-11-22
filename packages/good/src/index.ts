import statValues from "./upstream/stat-values.json";
import { z } from "zod";
import { artifactSchema } from "./upstream/artifact";
import {
  artSlotMainKeys,
  artMaxLevel,
  artSubstatRollData,
} from "./upstream/keys";
export {
  allArtifactSetKeys,
  allArtifactSlotKeys,
  allMainStatKeys,
  allSubstatKeys,
  artSlotMainKeys,
} from "./upstream/keys";
export { allLocationCharacterKeys } from "./upstream/locations";

// The scanner writes only the artifact portion of the upstream GOOD v3 envelope.
const goodSchema = z.object({
  format: z.literal("GOOD"),
  version: z.literal(3),
  source: z.string().min(1),
  artifacts: z.array(artifactSchema),
});
export type GoodFile = z.infer<typeof goodSchema>;
export type Artifact = GoodFile["artifacts"][number];
export type ArtifactDraft = Partial<Artifact>;

export function displayMainValue(
  rarity: 4 | 5,
  key: Artifact["mainStatKey"],
  level: number,
) {
  const raw = statValues.main[rarity][key][level];
  if (raw === undefined) return;
  return key.endsWith("_") ? Number((raw * 100).toFixed(1)) : Math.round(raw);
}

function unchanged(input: unknown, parsed: unknown): boolean {
  if (Object.is(input, parsed)) return true;
  if (
    !input ||
    !parsed ||
    typeof input !== "object" ||
    typeof parsed !== "object"
  )
    return false;
  return (
    Object.entries(parsed).every(([k, v]) =>
      unchanged((input as Record<string, unknown>)[k], v),
    ) && Object.keys(input).length === Object.keys(parsed).length
  );
}

export function artifactIssuePaths(draft: ArtifactDraft): string[] {
  const result = artifactSchema.safeParse(draft);
  if (!result.success) return result.error.issues.map((i) => i.path.join("."));
  const artifact = result.data;
  const issues = Object.entries(artifact)
    .filter(([k, v]) => !unchanged(draft[k as keyof Artifact], v))
    .map(([k]) => k);
  if (artifact.rarity !== 4 && artifact.rarity !== 5) issues.push("rarity");
  if (
    !Number.isInteger(artifact.level) ||
    artifact.level > artMaxLevel[artifact.rarity]
  )
    issues.push("level");
  if (!artSlotMainKeys[artifact.slotKey].includes(artifact.mainStatKey))
    issues.push("mainStatKey");
  const active = artifact.substats;
  const inactive = artifact.unactivatedSubstats ?? [];
  const range = artSubstatRollData[artifact.rarity],
    upgrades = Math.floor(artifact.level / 4);
  if (
    active.length < Math.min(4, range.low + upgrades) ||
    active.length > Math.min(4, range.high + upgrades)
  )
    issues.push("substats");
  const stats = [...active, ...inactive];
  const used = new Set<string>([artifact.mainStatKey]);
  let totals = new Set([0]);
  for (const [index, stat] of stats.entries()) {
    const isActive = index < active.length;
    const path = isActive
      ? "substats." + index
      : "unactivatedSubstats." + (index - active.length);
    const options: Record<string, number[]> =
      stat.key && artifact.rarity !== 3
        ? statValues.rolls[artifact.rarity][stat.key]
        : {};
    const counts = options[String(stat.value)] ?? [];

    if (!stat.key || used.has(stat.key)) issues.push(path + ".key");
    if (
      stat.value <= 0 ||
      (stat.key && (!counts.length || (!isActive && !counts.includes(1))))
    )
      issues.push(path + ".value");
    used.add(stat.key);

    if (isActive) {
      totals = new Set(
        [...totals].flatMap((total) => counts.map((n) => total + n)),
      );
    }
  }

  if (
    totals.size &&
    ![...totals].some(
      (n) => n >= range.low + upgrades && n <= range.high + upgrades,
    )
  )
    issues.push("substats");
  if (stats.length > 4) issues.push("unactivatedSubstats");
  return [...new Set(issues)];
}

export function validateArtifact(draft: ArtifactDraft): string[] {
  return [
    ...new Set(artifactIssuePaths(draft).map((path) => path.split(".")[0])),
  ];
}

export function exportGood(
  drafts: readonly ArtifactDraft[],
  source = "genshin-scanner",
): GoodFile {
  for (const [i, draft] of drafts.entries()) {
    const issues = validateArtifact(draft);
    if (issues.length)
      throw new Error("Artifact " + (i + 1) + ": " + issues.join(", "));
  }
  return goodSchema.parse({
    format: "GOOD",
    version: 3,
    source,
    artifacts: drafts,
  });
}
