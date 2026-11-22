import { useRef, useState } from "react";
import { scanVideo, type ScanProgress } from "@scanner/browser";
import type { Row } from "./review";

const assetBase = new URL(import.meta.env.BASE_URL + "ocr/", document.baseURI);

export function useRecordingScan() {
  const active = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, select] = useState(0);
  const [progress, setProgress] = useState<ScanProgress>();
  const [status, setStatus] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [filename, setFilename] = useState("");

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

  function changeSelected(edit: (row: Row) => Row) {
    setRows((list) =>
      list.map((row, index) => (index === selected ? edit(row) : row)),
    );
  }

  return {
    rows,
    selected,
    select,
    progress,
    status,
    skipped,
    filename,
    start,
    changeSelected,
    cancel: () => active.current?.abort(),
  };
}
