import {
  artifactIssuePaths,
  allArtifactSetKeys,
  allArtifactSlotKeys,
  allLocationCharacterKeys,
  allMainStatKeys,
  type ArtifactDraft,
  type Artifact,
} from "@scanner/good";
import type { Row } from "./review";
import { NumberField } from "./components/NumberField";
import { Choice } from "./components/Choice";
import { SubstatFields } from "./components/SubstatFields";

export function Editor({
  row,
  update,
  toggle,
}: {
  row: Row;
  update: (d: ArtifactDraft) => void;
  toggle: () => void;
}) {
  const a = row.draft;
  const issues = artifactIssuePaths(a);

  function fieldIssue(key: keyof Artifact) {
    if (a[key] === undefined) return "Choose or enter a value.";
    if (issues.includes(key)) return "Check this value against the recording.";
  }

  function patch<K extends keyof Artifact>(
    key: K,
    value: Artifact[K] | undefined,
  ) {
    update({ ...a, [key]: value });
  }

  return (
    <article className="rounded-xl border border-stone-300 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Artifact details</h2>
        <button
          className="cursor-pointer rounded-md border border-stone-300 px-3 py-2 hover:bg-stone-100"
          onClick={toggle}
        >
          {row.excluded ? "Include artifact" : "Exclude artifact"}
        </button>
      </div>
      <img
        className="mx-auto my-4 max-h-80 max-w-full object-contain"
        src={row.detail}
        alt="Recorded item panel"
      />
      {row.issues.length > 0 && (
        <p className="mb-3 rounded-md bg-amber-100 p-2 text-amber-950">
          Compare the highlighted fields with the recorded panel.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice
          label="Set"
          issue={fieldIssue("setKey")}
          value={a.setKey}
          options={allArtifactSetKeys}
          onChange={(v) => patch("setKey", v as Artifact["setKey"])}
        />
        <Choice
          label="Slot"
          issue={fieldIssue("slotKey")}
          value={a.slotKey}
          options={allArtifactSlotKeys}
          onChange={(v) => patch("slotKey", v as Artifact["slotKey"])}
        />
        <Choice
          label="Main stat"
          issue={fieldIssue("mainStatKey")}
          value={a.mainStatKey}
          options={allMainStatKeys}
          onChange={(v) => patch("mainStatKey", v as Artifact["mainStatKey"])}
        />
        <Choice
          label="Rarity"
          issue={fieldIssue("rarity")}
          value={a.rarity?.toString()}
          options={["4", "5"]}
          onChange={(v) => patch("rarity", Number(v) as 4 | 5)}
        />
        <NumberField
          label="Level"
          issue={fieldIssue("level")}
          min="0"
          max={a.rarity === 4 ? 16 : 20}
          value={a.level ?? ""}
          onChange={(e) =>
            patch(
              "level",
              e.target.value === "" ? undefined : e.target.valueAsNumber,
            )
          }
        />
        <Choice
          label="Equipped by"
          issue={fieldIssue("location")}
          value={a.location}
          options={["", ...allLocationCharacterKeys]}
          onChange={(v) => patch("location", v as Artifact["location"])}
        />
        <Choice
          label="Lock"
          issue={fieldIssue("lock")}
          value={
            a.lock === undefined ? undefined : a.lock ? "Locked" : "Unlocked"
          }
          options={["Locked", "Unlocked"]}
          onChange={(v) => patch("lock", v === "Locked")}
        />
      </div>
      {(["substats", "unactivatedSubstats"] as const).map((group) => (
        <SubstatFields
          key={group}
          group={group}
          issues={issues}
          stats={a[group] ?? []}
          onChange={(stats) => patch(group, stats)}
        />
      ))}
    </article>
  );
}
