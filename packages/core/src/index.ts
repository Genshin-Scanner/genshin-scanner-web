import type { ArtifactDraft } from "@scanner/good";
import { validateArtifact } from "@scanner/good";
import { english, type LocaleProfile } from "./english";
import { pcLayout, type LayoutProfile } from "./layout";
import { crop, type Pixels } from "./pixels";
export * from "./pixels";
export * from "./layout";
export * from "./english";
export type Field = "header" | "level" | "stats" | "set" | "equipped";
export type Ocr = (image: Pixels, field: Field) => Promise<string>;
export async function recognizeArtifact(
  frame: Pixels,
  read: Ocr,
  locale: LocaleProfile = english,
  layout: LayoutProfile = pcLayout,
) {
  const card = layout.locate(frame);
  if (!card) return;
  const text = {
    header: "",
    level: "",
    stats: "",
    set: "",
    equipped: undefined,
  } as import("./english").Readings;
  for (const field of [
    "header",
    "level",
    "stats",
    "set",
    "equipped",
  ] as const) {
    const region = card[field];
    if (region) text[field] = await read(crop(frame, region), field);
  }
  const draft: ArtifactDraft = {
    ...locale.parse(text),
    rarity: card.rarity === 4 || card.rarity === 5 ? card.rarity : undefined,
    lock: card.lock,
  };
  return {
    draft,
    issues: validateArtifact(draft),
    text,
    thumbnail: card.thumbnail,
  };
}
export { prepareText } from "./prepare";
