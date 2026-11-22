import { useId, type ComponentProps } from "react";
import { FieldHint } from "./FieldHint";

interface NumberFieldProps extends ComponentProps<"input"> {
  label: string;
  issue?: string;
}

export function NumberField({ label, issue, ...input }: Readonly<NumberFieldProps>) {
  const hintId = useId();

  return (
    <label className="grid min-w-0 gap-1 text-sm text-stone-700">
      {label}
      <input
        {...input}
        type="number"
        aria-label={label}
        aria-invalid={!!issue}
        aria-describedby={issue ? hintId : undefined}
        className="w-full min-w-0 rounded border border-stone-400 bg-white p-1.5 aria-invalid:border-amber-700 aria-invalid:bg-amber-50"
      />
      <FieldHint id={hintId} message={issue} />
    </label>
  );
}
