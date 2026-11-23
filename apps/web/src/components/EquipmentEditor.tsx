import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function EquipmentEditor({
  title,
  detail,
  excluded,
  include,
  exclude,
  flagged,
  toggle,
  children,
}: Readonly<{
  title: string;
  detail: string;
  excluded: boolean;
  include: string;
  exclude: string;
  flagged: boolean;
  toggle: () => void;
  children: ReactNode;
}>) {
  const { t } = useTranslation();

  return (
    <article className="rounded-xl border border-stone-300 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          type="button"
          className="cursor-pointer rounded-md border border-stone-300 px-3 py-2 hover:bg-stone-100"
          onClick={toggle}
        >
          {excluded ? include : exclude}
        </button>
      </div>
      <img
        className="mx-auto my-4 max-h-80 max-w-full object-contain"
        src={detail}
        alt={t("panel")}
      />
      {flagged && (
        <p className="mb-3 rounded-md bg-amber-100 p-2 text-amber-950">
          {t("compare")}
        </p>
      )}
      {children}
    </article>
  );
}
