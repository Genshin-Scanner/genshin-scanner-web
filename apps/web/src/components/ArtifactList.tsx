import { gameLabels } from "../gameLabels";
import { useTranslation } from "react-i18next";
import type { Row } from "../review";

interface ArtifactListProps {
  rows: Row[];
  selected: number;
  select: (index: number) => void;
}

export function ArtifactList({ rows, selected, select }: Readonly<ArtifactListProps>) {
  const { t, i18n } = useTranslation();
  const labels = gameLabels(i18n.resolvedLanguage);

  return (
    <nav
      className="max-h-64 overflow-auto rounded-xl border border-stone-300 bg-white p-2 md:max-h-[80vh]"
      aria-label={t("list")}
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
            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-stone-100 aria-pressed:ring-2 aria-pressed:ring-inset aria-pressed:ring-emerald-800 data-[review=true]:bg-amber-100 data-[review=true]:hover:bg-amber-200"
            key={i}
            data-order={i}
            data-review={!r.excluded && r.issues.length > 0}
            aria-pressed={i === selected}
            onClick={() => select(i)}
          >
            <img
              className="size-12 shrink-0 rounded-md object-cover"
              src={r.image}
              alt=""
            />
            <span className="text-sm font-semibold">
              {r.draft.setKey ? labels.sets[r.draft.setKey] : t("unidentified")}
              <small className="block text-xs font-normal text-stone-600">
                {t("timestamp", {
                  time: r.time.toLocaleString(i18n.resolvedLanguage, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }),
                })}{" "}
                ·{" "}
                {r.excluded
                  ? t("excluded")
                  : r.issues.length === 0
                    ? t("review")
                    : t("ready")}
              </small>
            </span>
          </button>
        ))}
    </nav>
  );
}
