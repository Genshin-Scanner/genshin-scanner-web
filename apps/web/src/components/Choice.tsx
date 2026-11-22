import { useTranslation } from "react-i18next";
import { useId } from "react";
import { FieldHint } from "./FieldHint";

export function Choice<Key extends string>({
  label,
  value,
  options,
  issue,
  optionLabel,
  onChange,
}: Readonly<{
  label: string;
  issue?: string;
  value?: string;
  options: readonly Key[];
  optionLabel?: (key: Key) => string;
  onChange: (value: Key) => void;
}>) {
  const { t } = useTranslation();

  const hintId = useId();

  return (
    <label className="grid min-w-0 gap-1 text-sm text-stone-700">
      {label}
      <select
        className="w-full min-w-0 rounded border border-stone-400 bg-white p-1.5 aria-invalid:border-amber-700 aria-invalid:bg-amber-50"
        aria-label={label}
        aria-invalid={!!issue}
        aria-describedby={issue ? hintId : undefined}
        value={value ?? "?"}
        onChange={(e) => onChange(e.target.value as Key)}
      >
        <option value="?" disabled>
          {t("choose")}
        </option>
        {options.map((k) => (
          <option key={k} value={k}>
            {optionLabel?.(k) ?? (k || t("unequipped"))}
          </option>
        ))}
      </select>
      <FieldHint id={hintId} message={issue} />
    </label>
  );
}
