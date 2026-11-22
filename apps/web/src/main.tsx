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
      <header className="flex min-h-18 items-center justify-between gap-3 border-b border-stone-300 bg-stone-50 px-6 text-stone-600 sm:px-[6vw]">
        <div className="font-bold tracking-tight text-emerald-950">
          <span
            aria-hidden="true"
            className="mr-2 align-middle text-3xl text-amber-700"
          >
            ✧
          </span>{" "}
          Inventory Scanner
        </div>
        <span>Genshin Impact</span>
      </header>
      <main className="mx-auto my-9 max-w-[1100px] px-4 pb-16 sm:my-16 sm:px-7">
        <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-tight tracking-tight text-emerald-950">
          Scan your artifacts
        </h1>
        <p className="mt-4 mb-8 max-w-2xl text-lg text-stone-600">
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
          className={`flex flex-wrap items-center gap-5 rounded-xl border border-dashed border-stone-400 p-5 sm:p-8 ${drag ? "bg-emerald-50" : "bg-white"}`}
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
          <div
            className="hidden size-14 shrink-0 place-items-center rounded-xl bg-emerald-100 text-3xl text-emerald-900 sm:grid"
            aria-hidden="true"
          >
            ▷
          </div>
          <div className="min-w-0 flex-1 basis-52">
            <h2 className="text-xl font-semibold wrap-anywhere">
              {filename || "Inventory recording"}
            </h2>
            <p className="text-sm text-stone-600">
              MP4 · H.264 · English PC inventory · 4★ and 5★
            </p>
            {progress && (
              <>
                <progress
                  className="w-full accent-emerald-800"
                  max={progress.total}
                  value={progress.done}
                />
                <div role="status">
                  {progress.phase} ·{" "}
                  {Math.round((progress.done / progress.total) * 100)}%
                </div>
              </>
            )}
            {status && <div role="status">{status}</div>}
          </div>
          {busy ? (
            <button
              className="cursor-pointer rounded-md border border-stone-300 px-4 py-2 hover:bg-stone-100"
              onClick={() => active.current?.abort()}
            >
              Cancel scan
            </button>
          ) : (
            <button
              className="cursor-pointer rounded-md bg-emerald-900 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-default disabled:opacity-45"
              onClick={() => input.current?.click()}
            >
              {filename ? "Choose another file" : "Choose video"}
            </button>
          )}
        </section>
        <small className="mt-2 block text-sm text-stone-600">
          Video processing stays on this device.
        </small>
        {!!rows.length && (
          <>
            <div className="mt-10 mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold wrap-anywhere">
                  Scanned artifacts
                </h2>
                <p
                  data-testid="review-counts"
                  className="text-sm text-stone-600"
                >
                  {included.length} included · {flagged.length} to review ·{" "}
                  {rows.length - included.length} excluded · {skipped}{" "}
                  unsupported
                </p>
              </div>
              <button
                className="cursor-pointer rounded-md bg-emerald-900 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-default disabled:opacity-45"
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
            <div className="grid items-start gap-5 md:grid-cols-[minmax(14rem,0.85fr)_minmax(20rem,1.6fr)]">
              <nav
                className="max-h-64 overflow-auto rounded-xl border border-stone-300 bg-white p-2 md:max-h-[80vh]"
                aria-label="Scanned artifacts"
              >
                {rows
                  .map((r, i) => ({ r, i }))
                  .sort(
                    (a, b) =>
                      Number(!!b.r.issues.length && !b.r.excluded) -
                      Number(!!a.r.issues.length && !a.r.excluded),
                  )
                  .map(({ r, i }) => (
                    <button
                      className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-stone-100 aria-pressed:bg-emerald-100"
                      key={i}
                      data-order={i}
                      aria-pressed={i === selected}
                      onClick={() => select(i)}
                    >
                      <img
                        className="size-12 shrink-0 rounded-md object-cover"
                        src={r.image}
                        alt=""
                      />
                      <span className="text-sm font-semibold">
                        {r.draft.setKey?.replace(/([a-z])([A-Z])/g, "$1 $2") ||
                          "Unidentified artifact"}
                        <small className="block text-xs font-normal text-stone-600">
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
