import { useId } from "react";
import { useTranslation } from "react-i18next";
import { optimizerUrl } from "../links";

export function GoodImportHelp() {
  const { t } = useTranslation();
  const id = useId();

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={t("goodHelpLabel")}
        className="grid size-10 cursor-pointer place-items-center rounded-full border border-stone-400 font-semibold text-emerald-900 hover:border-emerald-700 hover:bg-emerald-50"
      >
        <span aria-hidden="true">?</span>
      </button>
      <div
        id={id}
        popover="auto"
        className="good-import-help inset-0 m-auto w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-stone-300 bg-white p-4 text-sm text-stone-700 shadow-lg"
      >
        <p>{t("goodHelpText")}</p>
        <a
          className="mt-3 inline-block font-medium text-emerald-900 underline underline-offset-2 hover:text-emerald-700"
          href={optimizerUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t("openOptimizer")}
        </a>
      </div>
    </>
  );
}
