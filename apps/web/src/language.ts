export type Language = "en" | "ru";

export function preferredLanguage(
  saved: string | null,
  languages: readonly string[],
): Language {
  if (saved === "en" || saved === "ru") return saved;

  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (base === "en" || base === "ru") return base;
  }
  return "en";
}
