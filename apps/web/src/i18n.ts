import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { preferredLanguage } from "./language";
import en from "./locales/en.json";
import ru from "./locales/ru.json";

const storageKey = "genshin-scanner.language";

function savedLanguage() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
  document.title = i18n.t("appName");
});

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: preferredLanguage(savedLanguage(), navigator.languages),
  fallbackLng: "en",
  initAsync: false,
  interpolation: { escapeValue: false },
});

export function switchLanguage(language: string) {
  void i18n.changeLanguage(language);
  try {
    localStorage.setItem(storageKey, language);
  } catch {
    // Browsers with blocked storage keep the selection for this session.
  }
}
