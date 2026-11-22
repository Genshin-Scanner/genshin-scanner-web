import { useTranslation } from "react-i18next";
import type { ScanStatus } from "../useRecordingScan";
import { useState, useRef } from "react";
import type { ScanProgress } from "@scanner/browser";

interface RecordingPickerProps {
  filename: string;
  progress?: ScanProgress;
  skipped: number;
  status: ScanStatus;
  start: (file?: File) => void;
  cancel: () => void;
}

export function RecordingPicker({
  filename,
  progress,
  status,
  skipped,
  start,
  cancel,
}: RecordingPickerProps) {
  const { t } = useTranslation();

  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <>
      <input
        ref={input}
        hidden
        type="file"
        accept="video/mp4,.mp4"
        aria-label={t("chooseRecording")}
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
            {filename || t("recording")}
          </h2>
          <p className="text-sm text-stone-600">{t("formats")}</p>
          {progress && (
            <>
              <progress
                className="w-full accent-emerald-800"
                max={progress.total}
                value={progress.done}
              />
              <div role="status">
                {t(progress.phase === "Finding cards" ? "finding" : "reading")}{" "}
                · {Math.round((progress.done / progress.total) * 100)}%
              </div>
            </>
          )}
          {status && <div role="status">{t(status, { total: skipped })}</div>}
        </div>
        {progress ? (
          <button
            className="cursor-pointer rounded-md border border-stone-300 px-4 py-2 hover:bg-stone-100"
            onClick={cancel}
          >
            {t("cancel")}
          </button>
        ) : (
          <button
            className="cursor-pointer rounded-md bg-emerald-900 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-default disabled:opacity-45"
            onClick={() => input.current?.click()}
          >
            {filename ? t("another") : t("chooseVideo")}
          </button>
        )}
      </section>
      <small className="mt-2 block text-sm text-stone-600">
        {t("privacy")}
      </small>
    </>
  );
}
