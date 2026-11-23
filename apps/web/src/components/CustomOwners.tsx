import { customOwnerKeys, type CustomOwnerNames } from "@scanner/core";
import { useTranslation } from "react-i18next";

interface CustomOwnersProps {
  names: CustomOwnerNames;
  disabled: boolean;
  onChange: (names: CustomOwnerNames) => void;
}

export function CustomOwners({
  names,
  disabled,
  onChange,
}: Readonly<CustomOwnersProps>) {
  const { t } = useTranslation();

  return (
    <details className="mb-4 rounded-lg border border-stone-300 bg-white px-4 py-3">
      <summary className="cursor-pointer font-medium">
        {t("customNames")}
      </summary>
      <p className="mt-2 text-sm text-stone-600">{t("customNamesHint")}</p>
      <fieldset disabled={disabled} className="mt-3 grid gap-3 sm:grid-cols-3">
        {customOwnerKeys.map((key) => (
          <label key={key} className="grid gap-1 text-sm text-stone-700">
            {t(key)}
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={names[key] ?? ""}
              className="rounded border border-stone-400 px-2 py-1.5 disabled:bg-stone-100"
              onChange={(event) =>
                onChange({ ...names, [key]: event.target.value })
              }
            />
          </label>
        ))}
      </fieldset>
    </details>
  );
}
