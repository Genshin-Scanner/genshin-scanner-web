import { useTranslation } from "react-i18next";

const repositoryUrl = "https://github.com/Genshin-Scanner/genshin-scanner-web";
const licenseUrl = import.meta.env.BASE_URL + "ocr/LICENSE-Genshin-Scanner.txt";

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-stone-300 text-sm text-stone-600">
      <div className="mx-auto flex max-w-275 flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 sm:px-7">
        <span>© 2026 Genshin Scanner contributors</span>
        <a className="underline hover:text-emerald-950" href={repositoryUrl}>
          GitHub
        </a>
        <a className="underline hover:text-emerald-950" href={licenseUrl}>
          {t("license")}
        </a>
      </div>
    </footer>
  );
}
