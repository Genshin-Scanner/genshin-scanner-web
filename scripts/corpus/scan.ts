import {
  scanVideo,
  type ScanItem,
  type ScanProgress,
} from "../../packages/browser/src";
import {
  createEnglishProfile,
  pcLayout,
  markFrame,
} from "../../packages/core/src";

export type RawItem = Pick<ScanItem, "time" | "draft" | "issues">;

export async function scan(
  file: File,
  names: Parameters<typeof createEnglishProfile>[0],
) {
  const items: RawItem[] = [];
  const milliseconds: Partial<Record<ScanProgress["phase"], number>> = {};
  let phase: ScanProgress["phase"] = "Finding cards";
  let since = performance.now();

  function finishPhase() {
    const now = performance.now();
    milliseconds[phase] = (milliseconds[phase] ?? 0) + now - since;
    since = now;
  }

  const skipped = await scanVideo(
    file,
    new URL("/ocr/", location.href),
    new AbortController().signal,
    (progress) => {
      if (phase !== progress.phase) {
        finishPhase();
        phase = progress.phase;
      }
    },
    ({ draft, issues, time }) => items.push({ draft, issues, time }),
    { locale: createEnglishProfile(names), layout: pcLayout, mark: markFrame },
  );
  finishPhase();
  return { items, skipped, milliseconds };
}
