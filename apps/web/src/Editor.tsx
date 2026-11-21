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
    <label>
      {label}
      <select
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
    <article>
      <div className="editor-title">
        <h2>Artifact details</h2>
        <button onClick={toggle}>
          {row.excluded ? "Include artifact" : "Exclude artifact"}
        </button>
      </div>
      <img
        className="card-preview"
        src={row.detail}
        alt="Recorded item panel"
      />
      {row.issues.length > 0 && (
        <p className="notice">Check {row.issues.join(", ")}</p>
      )}
      <div className="fields">
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
        <label>
          Level
          <input
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
            <h3>{key === "substats" ? "Substats" : "Unactivated substats"}</h3>
            {stats.map((s, i) => (
              <div className="stat" key={i}>
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
                <label>
                  Value
                  <input
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
