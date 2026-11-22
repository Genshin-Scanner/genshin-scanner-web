import {
  allArtifactSetKeys,
  allArtifactSlotKeys,
  allLocationCharacterKeys,
  allMainStatKeys,
  allSubstatKeys,
  type ArtifactDraft,
  type Artifact,
} from "@scanner/good";
import type { Row } from "./review";
function Choice({
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
export function Editor({
  row,
  update,
  toggle,
}: {
  row: Row;
  update: (d: ArtifactDraft) => void;
  toggle: () => void;
}) {
  const a = row.draft;
  function patch<K extends keyof Artifact>(
    key: K,
    value: Artifact[K] | undefined,
  ) {
    update({ ...a, [key]: value });
  }
  return (
    <article className="rounded-xl border border-stone-300 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Artifact details</h2>
        <button
          className="cursor-pointer rounded-md border border-stone-300 px-3 py-2 hover:bg-stone-100"
          onClick={toggle}
        >
          {row.excluded ? "Include artifact" : "Exclude artifact"}
        </button>
      </div>
      <img
        className="mx-auto my-4 max-h-80 max-w-full object-contain"
        src={row.detail}
        alt="Recorded item panel"
      />
      {row.issues.length > 0 && (
        <p className="mb-3 rounded-md bg-amber-100 p-2 text-amber-950">
          Check {row.issues.join(", ")}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice
          label="Set"
          value={a.setKey}
          options={allArtifactSetKeys}
          onChange={(v) => patch("setKey", v as Artifact["setKey"])}
        />
        <Choice
          label="Slot"
          value={a.slotKey}
          options={allArtifactSlotKeys}
          onChange={(v) => patch("slotKey", v as Artifact["slotKey"])}
        />
        <Choice
          label="Main stat"
          value={a.mainStatKey}
          options={allMainStatKeys}
          onChange={(v) => patch("mainStatKey", v as Artifact["mainStatKey"])}
        />
        <Choice
          label="Rarity"
          value={a.rarity?.toString()}
          options={["4", "5"]}
          onChange={(v) => patch("rarity", Number(v) as 4 | 5)}
        />
        <label className="grid min-w-0 gap-1 text-sm text-stone-700">
          Level
          <input
            className="w-full min-w-0 rounded border border-stone-400 bg-white p-1.5"
            type="number"
            min="0"
            max={a.rarity === 4 ? 16 : 20}
            value={a.level ?? ""}
            onChange={(e) =>
              patch(
                "level",
                e.target.value === "" ? undefined : e.target.valueAsNumber,
              )
            }
          />
        </label>
        <Choice
          label="Equipped by"
          value={a.location}
          options={["", ...allLocationCharacterKeys]}
          onChange={(v) => patch("location", v as Artifact["location"])}
        />
        <Choice
          label="Lock"
          value={
            a.lock === undefined ? undefined : a.lock ? "Locked" : "Unlocked"
          }
          options={["Locked", "Unlocked"]}
          onChange={(v) => patch("lock", v === "Locked")}
        />
      </div>
      {(["substats", "unactivatedSubstats"] as const).map((key) => {
        const stats = a[key] ?? [];
        return (
          <section key={key}>
            <h3 className="mt-5 font-semibold">
              {key === "substats" ? "Substats" : "Unactivated substats"}
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
                  onChange={(v) =>
                    patch(
                      key,
                      stats.map((old, j) =>
                        j === i ? { ...old, key: v as typeof s.key } : old,
                      ),
                    )
                  }
                />
                <label className="grid min-w-0 gap-1 text-sm text-stone-700">
                  Value
                  <input
                    className="w-full min-w-0 rounded border border-stone-400 bg-white p-1.5"
                    type="number"
                    step="any"
                    value={s.value || ""}
                    onChange={(e) =>
                      patch(
                        key,
                        stats.map((old, j) =>
                          j === i
                            ? { ...old, value: e.target.valueAsNumber || 0 }
                            : old,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="cursor-pointer rounded-md border border-stone-300 px-3 py-2 hover:bg-stone-100"
                  aria-label={"Remove " + key + " " + (i + 1)}
                  onClick={() =>
                    patch(
                      key,
                      stats.filter((_, j) => j !== i),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
            {stats.length < 4 && (
              <button
                className="cursor-pointer rounded-md border border-stone-300 px-3 py-2 hover:bg-stone-100"
                onClick={() => patch(key, [...stats, { key: "", value: 0 }])}
              >
                Add stat
              </button>
            )}
          </section>
        );
      })}
    </article>
  );
}
