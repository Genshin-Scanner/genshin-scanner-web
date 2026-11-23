import { useTranslation } from "react-i18next";
import type { SkippedInventory } from "@scanner/browser";
import type { InventoryRow } from "../review";
import { GoodImportHelp } from "./GoodImportHelp";

interface ReviewSummaryProps {
  rows: InventoryRow[];
  skipped: SkippedInventory;
  charactersToReview: number;
  complete: boolean;
  save: () => void;
}

export function ReviewSummary({
  rows,
  skipped,
  charactersToReview,
  complete,
  save,
}: Readonly<ReviewSummaryProps>) {
  const { t } = useTranslation();

  const included = rows.filter((row) => !row.excluded);
  const flagged = included.filter((row) => row.issues.length);

  return (
    <div className="mt-10 mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold wrap-anywhere">
          {t("scanResults")}
        </h2>
        <p data-testid="review-counts" className="text-sm text-stone-600">
          {t("counts", {
            included: included.length,
            flagged: flagged.length,
            excluded: rows.length - included.length,
            skipped: skipped.artifacts,
            skippedWeapons: skipped.weapons,
          })}
        </p>
        {charactersToReview > 0 && (
          <p className="text-sm text-amber-800">
            {t("charactersToReview", { count: charactersToReview })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="cursor-pointer rounded-md bg-emerald-900 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-default disabled:opacity-45"
          disabled={
            !complete ||
            !!flagged.length ||
            !included.length ||
            charactersToReview > 0
          }
          onClick={save}
        >
          {t("export")}
        </button>
        <GoodImportHelp />
      </div>
    </div>
  );
}
