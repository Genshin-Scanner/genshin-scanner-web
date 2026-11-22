import type { Row } from "../review";

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
}: ReviewSummaryProps) {
  const included = rows.filter((row) => !row.excluded);
  const flagged = included.filter((row) => row.issues.length);

  return (
    <div className="mt-10 mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold wrap-anywhere">
          Scanned artifacts
        </h2>
        <p data-testid="review-counts" className="text-sm text-stone-600">
          {included.length} included · {flagged.length} to review ·{" "}
          {rows.length - included.length} excluded · {skipped} unsupported
        </p>
      </div>
      <button
        className="cursor-pointer rounded-md bg-emerald-900 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-default disabled:opacity-45"
        disabled={!complete || !!flagged.length || !included.length}
        onClick={save}
      >
        Export GOOD
      </button>
    </div>
  );
}
