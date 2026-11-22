import { allSubstatKeys, type Artifact } from "@scanner/good";
import { Choice } from "./Choice";

interface SubstatFieldsProps {
  group: "substats" | "unactivatedSubstats";
  stats: Artifact["substats"];
  onChange: (stats: Artifact["substats"]) => void;
}

export function SubstatFields({ group, stats, onChange }: SubstatFieldsProps) {
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
      {stats.map((s, i) => (
        <div
          data-stat-row
          className="my-2 grid grid-cols-[minmax(0,1fr)_minmax(4rem,0.55fr)_auto] items-end gap-2"
          key={i}
        >
          <Choice
            label={"Stat " + (i + 1)}
            value={s.key || undefined}
            options={allSubstatKeys}
            onChange={(v) => changeStat(i, { key: v as typeof s.key })}
          />
          <label className="grid min-w-0 gap-1 text-sm text-stone-700">
            Value
            <input
              className="w-full min-w-0 rounded border border-stone-400 bg-white p-1.5"
              type="number"
              step="any"
              value={s.value || ""}
              onChange={(e) =>
                changeStat(i, { value: e.target.valueAsNumber || 0 })
              }
            />
          </label>
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
