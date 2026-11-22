import { useId } from "react";
import { FieldHint } from "./FieldHint";

export function Choice({
  label,
  value,
  options,
  issue,
  onChange,
}: {
  label: string;
  issue?: string;
  value?: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
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
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="?" disabled>
          Choose…
        </option>
        {options.map((k) => (
          <option key={k} value={k}>
            {k || "Unequipped"}
          </option>
        ))}
      </select>
      <FieldHint id={hintId} message={issue} />
    </label>
  );
}
