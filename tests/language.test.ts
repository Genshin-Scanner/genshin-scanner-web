import { expect, test } from "bun:test";
import { preferredLanguage } from "../apps/web/src/language";
import en from "../apps/web/src/locales/en.json";
import ru from "../apps/web/src/locales/ru.json";

test("a saved language takes priority over browser preferences", () => {
  expect(preferredLanguage("en", ["ru-RU"])).toBe("en");
  expect(preferredLanguage(null, ["fr", "ru-RU", "en"])).toBe("ru");
  expect(preferredLanguage("unknown", ["zh"])).toBe("en");
});

test("both UI languages cover the same messages and interpolation variables", () => {
  expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(ru[key].match(/{{\w+}}/g)?.sort()).toEqual(
      en[key].match(/{{\w+}}/g)?.sort(),
    );
  }
});
