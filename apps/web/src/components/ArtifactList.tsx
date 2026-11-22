import type { Row } from "../review";

interface ArtifactListProps {
  rows: Row[];
  selected: number;
  select: (index: number) => void;
}

export function ArtifactList({ rows, selected, select }: ArtifactListProps) {
  return (
    <nav
      className="max-h-64 overflow-auto rounded-xl border border-stone-300 bg-white p-2 md:max-h-[80vh]"
      aria-label="Scanned artifacts"
    >
      {rows
        .map((r, i) => ({ r, i }))
        .sort(
          (a, b) =>
            Number(!!b.r.issues.length && !b.r.excluded) -
            Number(!!a.r.issues.length && !a.r.excluded),
        )
        .map(({ r, i }) => (
          <button
            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-stone-100 aria-pressed:bg-emerald-100"
            key={i}
            data-order={i}
            aria-pressed={i === selected}
            onClick={() => select(i)}
          >
            <img
              className="size-12 shrink-0 rounded-md object-cover"
              src={r.image}
              alt=""
            />
            <span className="text-sm font-semibold">
              {r.draft.setKey?.replace(/([a-z])([A-Z])/g, "$1 $2") ||
                "Unidentified artifact"}
              <small className="block text-xs font-normal text-stone-600">
                {r.time.toFixed(1)} s ·{" "}
                {r.excluded ? "Excluded" : r.issues.length ? "Review" : "Ready"}
              </small>
            </span>
          </button>
        ))}
    </nav>
  );
}
