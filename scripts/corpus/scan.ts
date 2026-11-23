import {
  scanInventoryVideo,
  type InventoryScanItem,
  type ScanProgress,
} from "../../packages/browser/src";
import type { CustomOwnerNames } from "../../packages/core/src";

type Reading<T> = T extends InventoryScanItem
  ? Omit<T, "image" | "detail">
  : never;
export type RawItem = Reading<InventoryScanItem>;

export async function scan(file: File, names: CustomOwnerNames) {
  const items: RawItem[] = [];
  const milliseconds: Partial<Record<ScanProgress["phase"], number>> = {};
  let phase: ScanProgress["phase"] = "Finding cards";
  let since = performance.now();

  function finishPhase() {
    const now = performance.now();
    milliseconds[phase] = (milliseconds[phase] ?? 0) + now - since;
    since = now;
  }

  const skipped = await scanInventoryVideo(
    file,
    new URL("/ocr/", location.href),
    new AbortController().signal,
    (progress) => {
      if (phase !== progress.phase) {
        finishPhase();
        phase = progress.phase;
      }
    },
    ({ image: _, detail: __, ...item }) => items.push(item),
    names,
  );
  finishPhase();
  return { items, skipped, milliseconds };
}
