import {
  allWeaponKeys,
  weaponData,
  type Artifact,
  type WeaponKey,
} from "@scanner/good";
import en from "./locales/game-en.json";
import ru from "./locales/game-ru.json";
import weaponsRu from "./locales/weapon-ru.json";
import type { Language } from "./language";

type StatKey =
  | Artifact["mainStatKey"]
  | Exclude<Artifact["substats"][number]["key"], "">;

interface GameLabels {
  sets: Record<Artifact["setKey"], string>;
  slots: Record<Artifact["slotKey"], string>;
  stats: Record<StatKey, string>;
  characters: Record<Exclude<Artifact["location"], "">, string>;
  weapons: Record<WeaponKey, string>;
}

const weaponsEn = Object.fromEntries(
  allWeaponKeys.map((key) => [key, weaponData[key].name]),
) as Record<WeaponKey, string>;
const catalogs = {
  en: { ...en, weapons: weaponsEn },
  ru: { ...ru, weapons: weaponsRu },
} satisfies Record<Language, GameLabels>;

export function gameLabels(language?: string): GameLabels {
  return language === "ru" ? catalogs.ru : catalogs.en;
}
