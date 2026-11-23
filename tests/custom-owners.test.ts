import { test, expect } from "bun:test";
import { createEnglishProfile, english } from "../packages/core/src/english";

const input = { header: "", level: "", set: "", stats: "" };
const owner = (profile: typeof english, name: string) =>
  profile.parse({ ...input, equipped: "Equipped: " + name });

test("custom names resolve to GOOD owners and retain their canonical spellings", () => {
  const profile = createEnglishProfile({
    Traveler: "North Star",
    Wanderer: "Ветер",
    Manekin: "Aria",
  });
  expect(owner(profile, " northstar ").location).toBe("Traveler");
  expect(owner(profile, "NorthSt ar").location).toBe("Traveler");
  expect(owner(profile, "NorthSlar").location).toBe("Traveler");
  expect(owner(profile, "Ветер").location).toBe("Wanderer");
  expect(owner(profile, "Wanderer").location).toBe("Wanderer");
  expect(owner(profile, "Aria")).toMatchObject({
    unsupportedOwner: "Manekin",
    location: undefined,
  });
  expect(profile.parse(input).location).toBe("");
});

test("an unknown or ambiguous owner requires review", () => {
  const profile = createEnglishProfile({
    Traveler: "Same",
    Wanderer: "Same",
    Manekin: "Qiqi",
  });
  for (const name of ["Same", "Qiqi", "", "Who?"])
    expect(owner(profile, name).location).toBeUndefined();
  expect(owner(english, "Manekina").unsupportedOwner).toBe("Manekin");
  expect(owner(english, "Raiden Shogun").location).toBe("RaidenShogun");
});

test("handles the English OCR reading of sigma only for configured aliases", () => {
  const profile = createEnglishProfile({ Wanderer: "Σ-Fox" });
  expect(owner(profile, "Σ-Fox").location).toBe("Wanderer");
  expect(owner(profile, "Z-Fox").location).toBe("Wanderer");
  expect(owner(english, "Z-Fox").location).toBeUndefined();
  const ambiguous = createEnglishProfile({
    Wanderer: "Σ-Fox",
    Manekin: "Z-Fox",
  });
  expect(owner(ambiguous, "Z-Fox").location).toBeUndefined();
});
