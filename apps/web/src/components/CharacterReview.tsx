import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  talentKeys,
  talentLimits,
  travelerKeys,
  type CharacterDraft,
  type OwnerKey,
} from "@scanner/good";
import { gameLabels } from "../gameLabels";
import type { characterEntries, CharacterEntry } from "../review";
import { AscensionField } from "./AscensionField";
import { Choice } from "./Choice";
import { NumberField } from "./NumberField";

export function CharacterReview({
  entries,
  update,
}: Readonly<{
  entries: ReturnType<typeof characterEntries>;
  update: (owner: OwnerKey, entry: CharacterEntry) => void;
}>) {
  const { t, i18n } = useTranslation();
  const labels = gameLabels(i18n.resolvedLanguage);
  const [selected, select] = useState<OwnerKey>();
  const note = useId();
  const current =
    entries.find((entry) => entry.owner === selected) ?? entries[0];
  if (!current) return <p className="text-stone-600">{t("noOwners")}</p>;
  const { owner, draft, excluded, issues } = current;

  function edit(next: CharacterDraft) {
    update(owner, { draft: next, excluded });
  }

  function issue(path: string, value: unknown) {
    if (value === undefined) return t("missing");
    if (issues.includes(path)) return t("invalidCharacterField");
  }

  return (
    <div className="grid items-start gap-5 md:grid-cols-[minmax(14rem,0.85fr)_minmax(20rem,1.6fr)]">
      <nav
        aria-label={t("charactersTab")}
        className="max-h-64 overflow-auto rounded-xl border border-stone-300 bg-white p-2 md:max-h-[80vh]"
      >
        {entries.map((entry) => (
          <button
            type="button"
            key={entry.owner}
            aria-pressed={entry.owner === owner}
            className="w-full cursor-pointer rounded-md px-3 py-2 text-left hover:bg-stone-100 aria-pressed:ring-2 aria-pressed:ring-inset aria-pressed:ring-emerald-800 data-[review=true]:bg-amber-100"
            data-review={!entry.excluded && !!entry.issues.length}
            onClick={() => select(entry.owner)}
          >
            {labels.characters[entry.owner]}
            <span className="block text-xs text-stone-600">
              {t(
                entry.excluded
                  ? "excluded"
                  : entry.issues.length
                    ? "review"
                    : "ready",
              )}
            </span>
          </button>
        ))}
      </nav>
      <article className="rounded-xl border border-stone-300 bg-white p-4 sm:p-6">
        <h2 className="text-xl font-semibold">{labels.characters[owner]}</h2>
        <label className="mt-3 flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={excluded}
            aria-describedby={note}
            className="accent-emerald-800"
            onChange={(event) =>
              update(owner, { draft, excluded: event.target.checked })
            }
          />
          {t("excludeCharacterConfig")}
        </label>
        <p id={note} className="mt-1 text-sm text-stone-600">
          {t("excludeCharacterHint")}
        </p>
        {!excluded && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {owner === "Traveler" && (
              <Choice
                label={t("travelerElement")}
                value={draft.key}
                issue={issue("key", draft.key)}
                options={travelerKeys}
                optionLabel={(key) =>
                  t("elements_" + key.slice("Traveler".length))
                }
                onChange={(key) =>
                  edit({ key, level: draft.level, ascension: draft.ascension })
                }
              />
            )}
            <NumberField
              label={t("level")}
              issue={issue("level", draft.level)}
              min="1"
              max="100"
              value={draft.level ?? ""}
              onChange={(event) =>
                edit({
                  ...draft,
                  level: event.target.value
                    ? event.target.valueAsNumber
                    : undefined,
                })
              }
            />
            <AscensionField
              value={draft.ascension}
              issue={issue("ascension", draft.ascension)}
              onChange={(ascension) => edit({ ...draft, ascension })}
            />
            <NumberField
              label={t("constellation")}
              issue={issue("constellation", draft.constellation)}
              min="0"
              max="6"
              value={draft.constellation ?? ""}
              onChange={(event) =>
                edit({
                  ...draft,
                  constellation: event.target.value
                    ? event.target.valueAsNumber
                    : undefined,
                })
              }
            />
            <p className="text-sm text-stone-600 sm:col-span-2">
              {t("baseTalentHint")}
            </p>
            {talentKeys.map((key) => (
              <NumberField
                key={key}
                label={t("talents_" + key)}
                issue={issue("talent." + key, draft.talent?.[key])}
                min="1"
                max={
                  draft.ascension === undefined
                    ? 10
                    : talentLimits[draft.ascension]
                }
                value={draft.talent?.[key] ?? ""}
                onChange={(event) =>
                  edit({
                    ...draft,
                    talent: {
                      ...draft.talent,
                      [key]: event.target.value
                        ? event.target.valueAsNumber
                        : undefined,
                    },
                  })
                }
              />
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
