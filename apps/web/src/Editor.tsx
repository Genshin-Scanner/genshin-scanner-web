import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const a = row.draft;
  const issues = artifactIssuePaths(a);

  function fieldIssue(key: keyof Artifact) {
    if (a[key] === undefined) return t("missing");
    if (issues.includes(key)) return t("invalid");
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
        <h2 className="text-xl font-semibold">{t("details")}</h2>
        <button
          className="cursor-pointer rounded-md border border-stone-300 px-3 py-2 hover:bg-stone-100"
          onClick={toggle}
        >
          {row.excluded ? t("include") : t("exclude")}
        </button>
      </div>
      <img
        className="mx-auto my-4 max-h-80 max-w-full object-contain"
        src={row.detail}
        alt={t("panel")}
      />
      {row.issues.length > 0 && (
        <p className="mb-3 rounded-md bg-amber-100 p-2 text-amber-950">
          {t("compare")}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice
          label={t("setKey")}
          issue={fieldIssue("setKey")}
          value={a.setKey}
          options={allArtifactSetKeys}
          onChange={(v) => patch("setKey", v as Artifact["setKey"])}
        />
        <Choice
          label={t("slotKey")}
          issue={fieldIssue("slotKey")}
          value={a.slotKey}
          options={allArtifactSlotKeys}
          onChange={(v) => patch("slotKey", v as Artifact["slotKey"])}
        />
        <Choice
          label={t("mainStatKey")}
          issue={fieldIssue("mainStatKey")}
          value={a.mainStatKey}
          options={allMainStatKeys}
          onChange={(v) => patch("mainStatKey", v as Artifact["mainStatKey"])}
        />
        <Choice
          label={t("rarity")}
          issue={fieldIssue("rarity")}
          value={a.rarity?.toString()}
          options={["4", "5"]}
          onChange={(v) => patch("rarity", Number(v) as 4 | 5)}
        />
        <NumberField
          label={t("level")}
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
          label={t("location")}
          issue={fieldIssue("location")}
          value={a.location}
          options={["", ...allLocationCharacterKeys]}
          onChange={(v) => patch("location", v as Artifact["location"])}
        />
        <Choice
          label={t("lock")}
          issue={fieldIssue("lock")}
          value={
            a.lock === undefined ? undefined : a.lock ? "Locked" : "Unlocked"
          }
          options={["Locked", "Unlocked"]}
          optionLabel={(value) => t(value === "Locked" ? "locked" : "unlocked")}
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
