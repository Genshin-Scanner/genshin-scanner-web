import {
  exportInventoryGood,
  validateArtifact,
  validateCharacter,
  validateWeapon,
  type ArtifactDraft,
  type CharacterDraft,
  type OwnerKey,
  type WeaponDraft,
} from "@scanner/good";
import type { InventoryScanItem, ScanItem } from "@scanner/browser";

type Reading = Pick<ScanItem, "draft" | "issues" | "unsupportedOwner">;

export type Row = ScanItem & { excluded: boolean; original?: Reading };
type WeaponScanItem = Extract<InventoryScanItem, { kind: "weapon" }>;
type WeaponReading = Pick<
  WeaponScanItem,
  "draft" | "issues" | "unsupportedOwner"
>;
export type WeaponRow = WeaponScanItem & {
  excluded: boolean;
  original?: WeaponReading;
};
export type InventoryRow = (Row & { kind: "artifact" }) | WeaponRow;
export type CharacterEntry = { draft: CharacterDraft; excluded: boolean };
export type CharacterEdits = Partial<Record<OwnerKey, CharacterEntry>>;

function reading(row: Row): Reading {
  return {
    draft: row.draft,
    issues: row.issues,
    unsupportedOwner: row.unsupportedOwner,
  };
}

export function edited<T extends Row>(row: T, draft: ArtifactDraft): T {
  return {
    ...row,
    original: row.original ?? reading(row),
    draft,
    issues: validateArtifact(draft),
  };
}

export function editedWeapon(row: WeaponRow, draft: WeaponDraft): WeaponRow {
  return {
    ...row,
    original: row.original ?? {
      draft: row.draft,
      issues: row.issues,
      unsupportedOwner: row.unsupportedOwner,
    },
    draft,
    issues: validateWeapon(draft),
  };
}

function weaponConflicts(rows: InventoryRow[]) {
  const counts = new Map<OwnerKey, number>();
  for (const row of rows) {
    const owner = row.draft.location;
    if (row.kind === "weapon" && !row.excluded && owner) {
      counts.set(owner, (counts.get(owner) ?? 0) + 1);
    }
  }
  return new Set(
    [...counts].filter(([, count]) => count > 1).map(([owner]) => owner),
  );
}

export function inventoryReviewRows(rows: InventoryRow[]): InventoryRow[] {
  const conflicts = weaponConflicts(rows);
  return rows.map((row) =>
    row.kind === "weapon" &&
    !row.excluded &&
    row.draft.location &&
    conflicts.has(row.draft.location)
      ? { ...row, issues: [...row.issues, "locationConflict"] }
      : row,
  );
}

export function characterEntries(rows: InventoryRow[], edits: CharacterEdits) {
  const owners = new Set<OwnerKey>();
  for (const row of rows) {
    if (
      !row.excluded &&
      row.draft.location &&
      !row.issues.includes("location")
    ) {
      owners.add(row.draft.location);
    }
  }
  return [...owners].map((owner) => {
    const { draft, excluded } = edits[owner] ?? {
      draft: { key: owner === "Traveler" ? undefined : owner },
      excluded: false,
    };
    return { owner, draft, excluded, issues: validateCharacter(draft) };
  });
}

export function inventoryDownloadData(
  rows: InventoryRow[],
  edits: CharacterEdits,
) {
  const kept = inventoryReviewRows(rows).filter((row) => !row.excluded);
  if (!kept.length || kept.some((row) => row.issues.length)) {
    throw new Error("Resolve or exclude every flagged item before exporting.");
  }
  return exportInventoryGood({
    artifacts: kept.flatMap((row) =>
      row.kind === "artifact" ? [row.draft] : [],
    ),
    weapons: kept.flatMap((row) => (row.kind === "weapon" ? [row.draft] : [])),
    characters: characterEntries(rows, edits)
      .filter((entry) => !entry.excluded)
      .map((entry) => entry.draft),
  });
}

export function inventoryScanReport(rows: InventoryRow[]) {
  return {
    format: "genshin-scanner-review",
    version: 2,
    items: rows.map((row, index) => ({
      number: index + 1,
      kind: row.kind,
      time: row.time,
      ...(row.kind === "weapon" && { rarity: row.rarity }),
      ...(row.original ?? {
        draft: row.draft,
        issues: row.issues,
        unsupportedOwner: row.unsupportedOwner,
      }),
    })),
  };
}
