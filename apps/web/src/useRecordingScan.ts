import type { CustomOwnerNames } from "@scanner/core";
import { useRef, useState } from "react";
import {
  ScanError,
  scanInventoryVideo,
  type ScanProgress,
  type SkippedInventory,
} from "@scanner/browser";
import type { CharacterEdits, InventoryRow } from "./review";

export type ScanStatus =
  | ""
  | "complete"
  | "cancelled"
  | "unsupported"
  | "empty"
  | "failed"
  | ScanError["code"];

const assetBase = new URL(import.meta.env.BASE_URL + "ocr/", document.baseURI);

export function useRecordingScan(names: CustomOwnerNames) {
  const active = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [characters, setCharacters] = useState<CharacterEdits>({});
  const [progress, setProgress] = useState<ScanProgress>();
  const [status, setStatus] = useState<ScanStatus>("");
  const [skipped, setSkipped] = useState<SkippedInventory>({
    artifacts: 0,
    weapons: 0,
  });
  const [filename, setFilename] = useState("");

  async function start(file?: File) {
    if (!file || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setRows([]);
    setSkipped({ artifacts: 0, weapons: 0 });
    setCharacters({});
    setFilename(file.name);
    setStatus("");
    setProgress({ phase: "Finding cards", done: 0, total: 1 });
    let count = 0;
    try {
      const unsupported = await scanInventoryVideo(
        file,
        assetBase,
        controller.signal,
        setProgress,
        (item) => {
          count++;
          setRows((old) => [...old, { ...item, excluded: false }]);
        },
        names,
      );
      setSkipped(unsupported);
      setStatus(
        count
          ? "complete"
          : unsupported.artifacts || unsupported.weapons
            ? "unsupported"
            : "empty",
      );
    } catch (e) {
      setStatus(
        controller.signal.aborted
          ? "cancelled"
          : e instanceof ScanError
            ? e.code
            : "failed",
      );
      if (controller.signal.aborted) setRows([]);
    } finally {
      active.current = null;
      setProgress(undefined);
    }
  }

  function changeRow(index: number, edit: (row: InventoryRow) => InventoryRow) {
    setRows((list) => list.map((row, i) => (index === i ? edit(row) : row)));
  }

  return {
    rows,
    characters,
    setCharacters,
    progress,
    status,
    skipped,
    filename,
    start,
    changeRow,
    cancel: () => active.current?.abort(),
  };
}
