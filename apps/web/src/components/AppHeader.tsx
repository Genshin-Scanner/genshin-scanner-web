import { useTranslation } from "react-i18next";
import { switchLanguage } from "../i18n";
import { optimizerUrl } from "../links";

export function AppHeader() {
  const { t, i18n } = useTranslation();

  return (
    <header className="grid min-h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-stone-300 bg-stone-50 px-4 py-3 text-stone-600 sm:px-[6vw] md:grid-cols-[auto_1fr_auto]">
      <div className="col-span-2 flex items-center gap-2 font-bold tracking-tight text-emerald-950 md:col-span-1">
        <img
          src={import.meta.env.BASE_URL + "icon.svg"}
          alt=""
          width="32"
          height="32"
          className="shrink-0"
        />
        {t("appName")}
      </div>
      <nav
        aria-label={t("externalLinks")}
        className="flex flex-wrap gap-x-5 gap-y-2 text-sm md:justify-self-center"
      >
        <a
          className="underline underline-offset-2 hover:text-emerald-950"
          href="https://genshin.hoyoverse.com/en/"
          target="_blank"
          rel="noreferrer"
        >
          Genshin Impact
        </a>
        <a
          className="underline underline-offset-2 hover:text-emerald-950"
          href={optimizerUrl}
          target="_blank"
          rel="noreferrer"
        >
          Genshin Optimizer
        </a>
      </nav>
      <div>
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
