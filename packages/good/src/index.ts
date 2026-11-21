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

export function validateArtifact(draft: ArtifactDraft): string[] {
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
  for (const stat of stats) {
    if (
      !stat.key ||
      stat.value <= 0 ||
      used.has(stat.key) ||
      (!stat.key.endsWith("_") && !Number.isInteger(stat.value))
    )
      issues.push("substats");
    used.add(stat.key);
  }
  if (stats.length > 4) issues.push("unactivatedSubstats");
  return [...new Set(issues)];
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
