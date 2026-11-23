import { useTranslation } from "react-i18next";
import type { Row } from "../review";
import { GoodImportHelp } from "./GoodImportHelp";

interface ReviewSummaryProps {
  rows: Row[];
  skipped: number;
  complete: boolean;
  save: () => void;
}

export function ReviewSummary({
  rows,
  skipped,
  complete,
  save,
}: Readonly<ReviewSummaryProps>) {
  const { t } = useTranslation();

  const included = rows.filter((row) => !row.excluded);
  const flagged = included.filter((row) => row.issues.length);

  return (
    <div className="mt-10 mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold wrap-anywhere">{t("list")}</h2>
        <p data-testid="review-counts" className="text-sm text-stone-600">
          {t("counts", {
            included: included.length,
            flagged: flagged.length,
            excluded: rows.length - included.length,
            skipped,
          })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="cursor-pointer rounded-md bg-emerald-900 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-default disabled:opacity-45"
          disabled={!complete || !!flagged.length || !included.length}
          onClick={save}
        >
          {t("export")}
        </button>
        <GoodImportHelp />
      </div>
    </div>
  );
}
