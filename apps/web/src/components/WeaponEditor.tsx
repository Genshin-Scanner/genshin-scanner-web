import {
  allLocationCharacterKeys,
  allWeaponKeys,
  weaponData,
  type WeaponDraft,
} from "@scanner/good";
import { useTranslation } from "react-i18next";
import { gameLabels } from "../gameLabels";
import type { WeaponRow } from "../review";
import { AscensionField } from "./AscensionField";
import { Choice } from "./Choice";
import { EquipmentEditor } from "./EquipmentEditor";
import { NumberField } from "./NumberField";

const supportedWeapons = allWeaponKeys.filter(
  (key) => weaponData[key].rarity >= 3,
);
const ranks = ["1", "2", "3", "4", "5"] as const;

export function WeaponEditor({
  row,
  update,
  toggle,
}: Readonly<{
  row: WeaponRow;
  update: (draft: WeaponDraft) => void;
  toggle: () => void;
}>) {
  const { t, i18n } = useTranslation();
  const labels = gameLabels(i18n.resolvedLanguage);
  const draft = row.draft;
  const weapons = [...supportedWeapons].sort((a, b) =>
    labels.weapons[a].localeCompare(labels.weapons[b], i18n.resolvedLanguage),
  );

  function issue(key: keyof WeaponDraft) {
    if (
      key === "location" &&
      draft.location === undefined &&
      row.unsupportedOwner
    )
      return t("manekinOwner");
    if (key === "location" && row.issues.includes("locationConflict"))
      return t("weaponOwnerConflict");
    if (draft[key] === undefined) return t("missing");
    if (row.issues.includes(key)) return t("invalid");
  }

  return (
    <EquipmentEditor
      title={t("weaponDetails")}
      detail={row.detail}
      excluded={row.excluded}
      include={t("includeWeapon")}
      exclude={t("excludeWeapon")}
      flagged={!!row.issues.length}
      toggle={toggle}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice
          label={t("weaponName")}
          value={draft.key}
          issue={issue("key")}
          options={weapons}
          optionLabel={(key) => labels.weapons[key]}
          onChange={(key) => update({ ...draft, key })}
        />
        <Choice
          label={t("location")}
          value={draft.location}
          issue={issue("location")}
          options={["", ...allLocationCharacterKeys] as const}
          optionLabel={(key) =>
            key ? labels.characters[key] : t("unequipped")
          }
          onChange={(location) => update({ ...draft, location })}
        />
        <NumberField
          label={t("level")}
          issue={issue("level")}
          min="1"
          max="90"
          value={draft.level ?? ""}
          onChange={(e) =>
            update({
              ...draft,
              level: e.target.value ? e.target.valueAsNumber : undefined,
            })
          }
        />
        <AscensionField
          value={draft.ascension}
          issue={issue("ascension")}
          onChange={(ascension) => update({ ...draft, ascension })}
        />
        <Choice
          label={t("refinement")}
          value={draft.refinement?.toString()}
          issue={issue("refinement")}
          options={ranks}
          onChange={(rank) =>
            update({
              ...draft,
              refinement: Number(rank) as WeaponDraft["refinement"],
            })
          }
        />
        <Choice
          label={t("lock")}
          value={
            draft.lock === undefined
              ? undefined
              : draft.lock
                ? "locked"
                : "unlocked"
          }
          issue={issue("lock")}
          options={["locked", "unlocked"]}
          optionLabel={(key) => t(key)}
          onChange={(key) => update({ ...draft, lock: key === "locked" })}
        />
      </div>
    </EquipmentEditor>
  );
}
