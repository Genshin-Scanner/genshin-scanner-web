import type { Artifact } from "@scanner/good";
import en from "./locales/game-en.json";
import ru from "./locales/game-ru.json";
import type { Language } from "./language";

type StatKey =
  | Artifact["mainStatKey"]
  | Exclude<Artifact["substats"][number]["key"], "">;

interface GameLabels {
  sets: Record<Artifact["setKey"], string>;
  slots: Record<Artifact["slotKey"], string>;
  stats: Record<StatKey, string>;
  characters: Record<Exclude<Artifact["location"], "">, string>;
}

const catalogs = { en, ru } satisfies Record<Language, GameLabels>;

export function gameLabels(language?: string): GameLabels {
  return language === "ru" ? catalogs.ru : catalogs.en;
}
