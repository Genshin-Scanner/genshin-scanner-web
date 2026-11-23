import { expect, test } from "bun:test";
import {
  allArtifactSetKeys,
  allArtifactSlotKeys,
  allLocationCharacterKeys,
  allMainStatKeys,
  allSubstatKeys,
  allWeaponKeys,
} from "../packages/good/src";
import { gameLabels } from "../apps/web/src/gameLabels";

test("each GOOD option has a game label in both languages", () => {
  for (const language of ["ru", "en"]) {
    const labels = gameLabels(language);
    for (const key of allArtifactSetKeys)
      expect(labels.sets[key].trim()).toBeTruthy();
    for (const key of allArtifactSlotKeys)
      expect(labels.slots[key].trim()).toBeTruthy();
    for (const key of allLocationCharacterKeys)
      expect(labels.characters[key].trim()).toBeTruthy();
    for (const key of allWeaponKeys)
      expect(labels.weapons[key].trim()).toBeTruthy();
    for (const key of [...allMainStatKeys, ...allSubstatKeys])
      expect(labels.stats[key].includes("%")).toBe(key.endsWith("_"));
  }
  expect(gameLabels("ru").stats.atk_).toBe("Сила атаки, %");
  expect(gameLabels("ru").stats.atk).toBe("Сила атаки");
});
