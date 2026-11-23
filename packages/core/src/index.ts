import type { ArtifactDraft } from "@scanner/good";
import { validateArtifact } from "@scanner/good";
import { english, type LocaleProfile, type Readings } from "./english";
import { pcLayout, type LayoutProfile } from "./layout";
import { crop, type Pixels } from "./pixels";
import { splitStatLines } from "./prepare";
export * from "./pixels";
export * from "./layout";
export * from "./english";
export type Field =
  | "header"
  | "headerLine"
  | "ownerLine"
  | "mainValueMask"
  | "mainValue"
  | "level"
  | "weaponTitle"
  | "weaponLevel"
  | "weaponRefinement"
  | "stats"
  | "statLine"
  | "set"
  | "equipped";
export type Ocr = (image: Pixels, field: Field) => Promise<string>;
export async function recognizeArtifact(
  frame: Pixels,
  read: Ocr,
  locale: LocaleProfile = english,
  layout: LayoutProfile = pcLayout,
) {
  const card = layout.locate(frame);
  if (!card) return;
  const text: Readings = {
    header: "",
    level: "",
    stats: "",
    set: "",
    equipped: undefined,
  };
  for (const field of [
    "header",
    "mainValue",
    "level",
    "stats",
    "set",
    "equipped",
  ] as const) {
    const region = card[field];
    if (region) {
      const image = crop(frame, region);
      if (field === "stats") {
        const lines = splitStatLines(image);
        const readings: string[] = [];
        for (const line of lines)
          readings.push(
            await (locale.readStatLine?.(line, read) ?? read(line, "statLine")),
          );
        text.stats = lines.length
          ? readings.join("\n")
          : await read(image, field);
      } else text[field] = await read(image, field);
    }
  }
  let parsed = locale.parse(text, card.rarity);
  if (!parsed.slotKey || !parsed.mainStatKey) {
    const labels: string[] = [];
    if (!parsed.slotKey && card.slotLabel)
      labels.push(await read(crop(frame, card.slotLabel), "headerLine"));
    if (card.mainLabel)
      labels.push(await read(crop(frame, card.mainLabel), "headerLine"));
    if (labels.length) {
      text.header = [...labels, text.header].join("\n");
      parsed = locale.parse(text, card.rarity);
    }
  }
  if (parsed.level === undefined) {
    const value = await read(
      crop(frame, { ...card.mainValue, width: card.mainValue.width * 0.72 }),
      "mainValueMask",
    );
    text.header += "\n" + value;
    parsed = locale.parse(text, card.rarity);
  }
  if (
    card.equipped &&
    parsed.location === undefined &&
    !parsed.unsupportedOwner
  ) {
    const alternate = {
      ...text,
      equipped: await read(crop(frame, card.equipped), "ownerLine"),
    };
    const owner = locale.parse(alternate, card.rarity);
    if (owner.location !== undefined || owner.unsupportedOwner) {
      text.equipped = alternate.equipped;
      parsed = owner;
    }
  }
  const { unsupportedOwner, ...fields } = parsed;
  const draft: ArtifactDraft = {
    ...fields,
    rarity: card.rarity === 4 || card.rarity === 5 ? card.rarity : undefined,
    lock: card.lock,
  };
  return {
    draft,
    issues: validateArtifact(draft),
    text,
    layout: card,
    thumbnail: card.thumbnail,
    unsupportedOwner,
  };
}
export { prepareText, splitStatLines } from "./prepare";
export * from "./video";
export * from "./weapon";
