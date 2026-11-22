import {
  exportGood,
  validateArtifact,
  type ArtifactDraft,
} from "@scanner/good";
import type { ScanItem } from "@scanner/browser";

export type Row = ScanItem & { excluded: boolean };

export function edited(row: Row, draft: ArtifactDraft): Row {
  return { ...row, draft, issues: validateArtifact(draft) };
}

export function downloadData(rows: Row[]) {
  const kept = rows.filter((r) => !r.excluded);
  if (!kept.length || kept.some((r) => r.issues.length))
    throw new Error("Resolve or exclude every flagged card before exporting.");
  return exportGood(kept.map((r) => r.draft));
}
