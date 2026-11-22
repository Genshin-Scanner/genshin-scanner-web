import { useState, useRef } from "react";
import type { ScanProgress } from "@scanner/browser";

interface RecordingPickerProps {
  filename: string;
  progress?: ScanProgress;
  status: string;
  start: (file?: File) => void;
  cancel: () => void;
}

export function RecordingPicker({
  filename,
  progress,
  status,
  start,
  cancel,
}: RecordingPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <>
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
        {progress ? (
          <button
            className="cursor-pointer rounded-md border border-stone-300 px-4 py-2 hover:bg-stone-100"
            onClick={cancel}
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
    </>
  );
}
