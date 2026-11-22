export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm text-stone-700">
      {label}
      <select
        className="w-full min-w-0 rounded border border-stone-400 bg-white p-1.5"
        aria-label={label}
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
    </label>
  );
}
