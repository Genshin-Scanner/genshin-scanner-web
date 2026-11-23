import {
  exportGood,
  validateArtifact,
  type ArtifactDraft,
} from "@scanner/good";
import type { ScanItem } from "@scanner/browser";

type Reading = Pick<ScanItem, "draft" | "issues" | "unsupportedOwner">;

export type Row = ScanItem & { excluded: boolean; original?: Reading };

function reading(row: Row): Reading {
  return {
    draft: row.draft,
    issues: row.issues,
    unsupportedOwner: row.unsupportedOwner,
  };
}

export function scanReport(rows: Row[]) {
  return {
    format: "genshin-scanner-review",
    version: 1,
    items: rows.map((row, index) => ({
      number: index + 1,
      time: row.time,
      ...(row.original ?? reading(row)),
    })),
  };
}

export function edited(row: Row, draft: ArtifactDraft): Row {
  return {
    ...row,
    original: row.original ?? reading(row),
    draft,
    issues: validateArtifact(draft),
  };
}

export function downloadData(rows: Row[]) {
  const kept = rows.filter((r) => !r.excluded);
  if (!kept.length || kept.some((r) => r.issues.length))
    throw new Error("Resolve or exclude every flagged card before exporting.");
  return exportGood(kept.map((r) => r.draft));
}
