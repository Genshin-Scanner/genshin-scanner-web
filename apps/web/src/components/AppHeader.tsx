import { useTranslation } from "react-i18next";
import { switchLanguage } from "../i18n";
export function AppHeader() {
  const { t, i18n } = useTranslation();

  return (
    <header className="flex min-h-18 items-center justify-between gap-3 border-b border-stone-300 bg-stone-50 px-6 text-stone-600 sm:px-[6vw]">
      <div className="font-bold tracking-tight text-emerald-950">
        <span
          aria-hidden="true"
          className="mr-2 align-middle text-3xl text-amber-700"
        >
          ✧
        </span>{" "}
        {t("appName")}
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden sm:inline">Genshin Impact</span>
        <select
          aria-label={t("language")}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm"
          value={i18n.resolvedLanguage}
          onChange={(e) => switchLanguage(e.target.value)}
        >
          <option lang="en" value="en">
            English
          </option>
          <option lang="ru" value="ru">
            Русский
          </option>
        </select>
      </div>
    </header>
  );
}
