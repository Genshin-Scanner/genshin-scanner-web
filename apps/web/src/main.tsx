import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { scanVideo, type ScanProgress } from "@scanner/browser";
import { downloadData, edited, type Row } from "./review";
import { Editor } from "./Editor";
import "./style.css";
const assetBase = new URL(import.meta.env.BASE_URL + "ocr/", document.baseURI);
function App() {
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<Row[]>([]),
    [selected, select] = useState(0),
    [progress, setProgress] = useState<ScanProgress>(),
    [status, setStatus] = useState(""),
    [skipped, setSkipped] = useState(0),
    [filename, setFilename] = useState(""),
    [drag, setDrag] = useState(false);
  const busy = !!progress;
  const included = rows.filter((r) => !r.excluded);
  const flagged = included.filter((r) => r.issues.length);
  async function start(file?: File) {
    if (!file || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setRows([]);
    setSkipped(0);
    select(0);
    setFilename(file.name);
    setStatus("");
    setProgress({ phase: "Finding cards", done: 0, total: 1 });
    let count = 0;
    try {
      const unsupported = await scanVideo(
        file,
        assetBase,
        controller.signal,
        setProgress,
        (item) => {
          count++;
          setRows((old) => [...old, { ...item, excluded: false }]);
        },
      );
      setSkipped(unsupported);
      setStatus(
        count
          ? "Scan complete"
          : unsupported
            ? unsupported + " unsupported artifacts skipped."
            : "No supported artifact cards found. Check the game language and recording layout.",
      );
    } catch (e) {
      setStatus(
        controller.signal.aborted
          ? "Scan cancelled"
          : e instanceof Error
            ? e.message
            : "Unable to scan recording",
      );
      if (controller.signal.aborted) setRows([]);
    } finally {
      active.current = null;
      setProgress(undefined);
    }
  }
  function save() {
    const data = downloadData(rows);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "genshin-artifacts.good.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const row = rows[selected];
  return (
    <>
      <header>
        <div className="brand">
          <span aria-hidden="true">✧</span> Inventory Scanner
        </div>
        <span>Genshin Impact</span>
      </header>
      <main>
        <h1>Scan your artifacts</h1>
        <p className="intro">
          Choose a recording of your inventory to review its artifacts and
          export them to Genshin Optimizer.
        </p>
        <input
          ref={input}
          hidden
          type="file"
          accept="video/mp4,.mp4"
          aria-label="Choose recording"
          onChange={(e) => {
            void start(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <section
          className={"drop " + (drag ? "drag" : "")}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void start(e.dataTransfer.files[0]);
          }}
        >
          <div className="film" aria-hidden="true">
            ▷
          </div>
          <div className="upload">
            <h2>{filename || "Inventory recording"}</h2>
            <p>MP4 · H.264 · English PC inventory · 4★ and 5★</p>
            {progress && (
              <>
                <progress max={progress.total} value={progress.done} />
                <div role="status">
                  {progress.phase} ·{" "}
                  {Math.round((progress.done / progress.total) * 100)}%
                </div>
              </>
            )}
            {status && <div role="status">{status}</div>}
          </div>
          {busy ? (
            <button onClick={() => active.current?.abort()}>Cancel scan</button>
          ) : (
            <button className="primary" onClick={() => input.current?.click()}>
              {filename ? "Choose another file" : "Choose video"}
            </button>
          )}
        </section>
        <small>Video processing stays on this device.</small>
        {!!rows.length && (
          <>
            <div className="summary">
              <div>
                <h2>Scanned artifacts</h2>
                <p>
                  {included.length} included · {flagged.length} to review ·{" "}
                  {rows.length - included.length} excluded · {skipped}{" "}
                  unsupported
                </p>
              </div>
              <button
                className="primary"
                disabled={
                  status !== "Scan complete" ||
                  !!flagged.length ||
                  !included.length
                }
                onClick={save}
              >
                Export GOOD
              </button>
            </div>
            <div className="work">
              <nav aria-label="Scanned artifacts">
                {rows
                  .map((r, i) => ({ r, i }))
                  .sort(
                    (a, b) =>
                      Number(!!b.r.issues.length && !b.r.excluded) -
                      Number(!!a.r.issues.length && !a.r.excluded),
                  )
                  .map(({ r, i }) => (
                    <button
                      className={"tile " + (i === selected ? "chosen" : "")}
                      key={i}
                      data-order={i}
                      aria-pressed={i === selected}
                      onClick={() => select(i)}
                    >
                      <img src={r.image} alt="" />
                      <span>
                        {r.draft.setKey?.replace(/([a-z])([A-Z])/g, "$1 $2") ||
                          "Unidentified artifact"}
                        <small>
                          {r.time.toFixed(1)} s ·{" "}
                          {r.excluded
                            ? "Excluded"
                            : r.issues.length
                              ? "Review"
                              : "Ready"}
                        </small>
                      </span>
                    </button>
                  ))}
              </nav>
              {row && (
                <Editor
                  row={row}
                  toggle={() =>
                    setRows((list) =>
                      list.map((r, i) =>
                        i === selected ? { ...r, excluded: !r.excluded } : r,
                      ),
                    )
                  }
                  update={(draft) =>
                    setRows((list) =>
                      list.map((r, i) =>
                        i === selected ? edited(r, draft) : r,
                      ),
                    )
                  }
                />
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
