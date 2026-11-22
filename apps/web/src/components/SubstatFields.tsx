import { allSubstatKeys, type Artifact } from "@scanner/good";
import { NumberField } from "./NumberField";
import { Choice } from "./Choice";

interface SubstatFieldsProps {
  issues: string[];
  group: "substats" | "unactivatedSubstats";
  stats: Artifact["substats"];
  onChange: (stats: Artifact["substats"]) => void;
}

export function SubstatFields({
  group,
  stats,
  onChange,
  issues,
}: SubstatFieldsProps) {
  function changeStat(
    index: number,
    patch: Partial<Artifact["substats"][number]>,
  ) {
    onChange(
      stats.map((stat, i) => (i === index ? { ...stat, ...patch } : stat)),
    );
  }

  return (
    <section>
      <h3 className="mt-5 font-semibold">
        {group === "substats" ? "Substats" : "Unactivated substats"}
      </h3>
      {issues.includes(group) && (
        <p className="my-2 rounded border-l-4 border-amber-600 bg-amber-50 p-2 text-sm text-amber-950">
          Check the number of stats and their rolls for this level and rarity.
        </p>
      )}
      {stats.map((s, i) => (
        <div
          data-stat-row
          className="my-2 grid grid-cols-[minmax(0,1fr)_minmax(4rem,0.55fr)_auto] items-end gap-2"
          key={i}
        >
          <Choice
            label={"Stat " + (i + 1)}
            issue={
              issues.includes(group + "." + i + ".key")
                ? "Choose a stat different from the main stat and other substats."
                : undefined
            }
            value={s.key || undefined}
            options={allSubstatKeys}
            onChange={(v) => changeStat(i, { key: v as typeof s.key })}
          />
          <NumberField
            label="Value"
            issue={
              issues.includes(group + "." + i + ".value")
                ? "Enter a valid roll value for this rarity."
                : undefined
            }
            step="any"
            value={s.value || ""}
            onChange={(e) =>
              changeStat(i, { value: e.target.valueAsNumber || 0 })
            }
          />
          <button
            className="cursor-pointer rounded-md border border-stone-300 px-3 py-2 hover:bg-stone-100"
            aria-label={"Remove " + group + " " + (i + 1)}
            onClick={() => onChange(stats.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      {stats.length < 4 && (
        <button
          className="cursor-pointer rounded-md border border-stone-300 px-3 py-2 hover:bg-stone-100"
          onClick={() => onChange([...stats, { key: "", value: 0 }])}
        >
          Add stat
        </button>
      )}
    </section>
  );
}
