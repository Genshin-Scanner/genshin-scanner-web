import { ScanError } from "./error";
import { abortable } from "./abort";
import {
  markFrame,
  markInventoryFrame,
  inventoryKind,
  InventorySegmentDetector,
  recognizeArtifact,
  recognizeWeapon,
  pcLayout,
  english,
  type LocaleProfile,
  type LayoutProfile,
  type Pixels,
  type Mark,
  type Segment,
  type Rect,
  type CustomOwnerNames,
  createEnglishProfile,
} from "@scanner/core";
import type { ArtifactDraft, WeaponDraft } from "@scanner/good";
import { openRecording } from "./recording";
import { openBrowserOcr } from "./ocr";
export interface ScanProfile {
  locale: LocaleProfile;
  layout: LayoutProfile;
  mark: (frame: Pixels) => Mark | undefined;
}
interface ScanEvidence {
  unsupportedOwner?: "Manekin";
  time: number;
  issues: string[];
  image: string;
  detail: string;
}
export interface ScanItem extends ScanEvidence {
  draft: ArtifactDraft;
}
export type InventoryScanItem =
  | (ScanItem & { kind: "artifact" })
  | (ScanEvidence & { kind: "weapon"; draft: WeaponDraft; rarity?: number });
export interface SkippedInventory {
  artifacts: number;
  weapons: number;
}
export type ScanProgress = {
  phase: "Preparing recording" | "Finding cards" | "Reading cards";
  done: number;
  total: number;
};
function canvas(width: number, height: number) {
  const el = document.createElement("canvas");
  el.width = Math.max(1, Math.round(width));
  el.height = Math.max(1, Math.round(height));
  const ctx = el.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new ScanError("canvas", "Canvas 2D unavailable");
  return ctx;
}
function preview(frame: HTMLCanvasElement, r: Rect, maxWidth: number) {
  const width = Math.min(r.width, maxWidth),
    ctx = canvas(width, (r.height * width) / r.width);
  ctx.drawImage(
    frame,
    r.x,
    r.y,
    r.width,
    r.height,
    0,
    0,
    ctx.canvas.width,
    ctx.canvas.height,
  );
  return ctx.canvas.toDataURL("image/webp", 0.83);
}
export async function scanVideo(
  file: File,
  modelBase: URL,
  signal: AbortSignal,
  progress: (p: ScanProgress) => void,
  onItem: (i: ScanItem) => void,
  profile?: ScanProfile,
) {
  profile ??= { locale: english, layout: pcLayout, mark: markFrame };
  const skipped = await scanRecording(
    file,
    modelBase,
    signal,
    progress,
    (item) => {
      if (item.kind === "artifact") {
        const { kind: _, ...artifact } = item;
        onItem(artifact);
      }
    },
    profile,
  );
  return skipped.artifacts;
}

export function scanInventoryVideo(
  file: File,
  modelBase: URL,
  signal: AbortSignal,
  progress: (p: ScanProgress) => void,
  onItem: (i: InventoryScanItem) => void,
  names: CustomOwnerNames = {},
) {
  return scanRecording(
    file,
    modelBase,
    signal,
    progress,
    onItem,
    {
      locale: createEnglishProfile(names),
      layout: pcLayout,
      mark: markInventoryFrame,
    },
    names,
  );
}

async function scanRecording(
  file: File,
  modelBase: URL,
  signal: AbortSignal,
  progress: (p: ScanProgress) => void,
  onItem: (i: InventoryScanItem) => void,
  profile: ScanProfile,
  names?: CustomOwnerNames,
): Promise<SkippedInventory> {
  const { video, seek, close } = await openRecording(file, signal, () =>
    progress({ phase: "Preparing recording", done: 0, total: 0 }),
  );
  let ocr: Awaited<ReturnType<typeof openBrowserOcr>> | undefined;
  try {
    const width = Math.min(video.videoWidth, 960),
      small = canvas(width, (video.videoHeight * width) / video.videoWidth);
    const detected: Segment[] = [];
    const detector = new InventorySegmentDetector();
    const steps = Math.ceil(video.duration * 10);
    // A seek changes the shared video element. Draw its frame before requesting the next one.
    for (let i = 0; i < steps; i++) {
      await seek(i / 10);
      small.drawImage(video, 0, 0, small.canvas.width, small.canvas.height);
      const frame = small.getImageData(
        0,
        0,
        small.canvas.width,
        small.canvas.height,
      );
      detected.push(...detector.push(i / 10, profile.mark(frame)));
      progress({ phase: "Finding cards", done: i + 1, total: steps });
    }
    detected.push(...detector.flush());
    detected.sort((a, b) => a.start - b.start);
    const skipped = { artifacts: 0, weapons: 0 };
    const segments = detected.filter((s) => {
      if (s.kind === "weapon") {
        if (s.rarity === 3 || s.rarity === 4 || s.rarity === 5) return true;
        skipped.weapons++;
      } else {
        if (s.rarity === 4 || s.rarity === 5) return true;
        skipped.artifacts++;
      }
      return false;
    });
    if (!segments.length) return skipped;
    progress({ phase: "Reading cards", done: 0, total: segments.length });
    const starting = openBrowserOcr(modelBase, profile.locale.language);
    void starting.then(
      async (w) => {
        if (signal.aborted) await w.close();
      },
      () => {},
    );
    ocr = await abortable(starting, signal);
    signal.throwIfAborted();
    // Interpolate small glyphs while their antialiased edges are still present.
    // Enlarging the binary OCR mask afterwards cannot recover those edges.
    const targetWidth = profile.layout.ocrWidth ?? video.videoWidth;
    const scale = Math.min(2, Math.max(1, targetWidth / video.videoWidth));
    const full = canvas(video.videoWidth * scale, video.videoHeight * scale);
    full.imageSmoothingQuality = "high";
    const readAt = async (
      time: number,
      segment: Segment,
    ): Promise<InventoryScanItem> => {
      await seek(time);
      full.drawImage(video, 0, 0, full.canvas.width, full.canvas.height);
      const frame = full.getImageData(
        0,
        0,
        full.canvas.width,
        full.canvas.height,
      );
      const kind = segment.kind ?? "artifact";
      const weapon =
        kind === "weapon" &&
        (await abortable(recognizeWeapon(frame, ocr!.read, names), signal));
      const artifact =
        kind === "artifact" &&
        (!names || inventoryKind(frame) === kind) &&
        (await abortable(
          recognizeArtifact(frame, ocr!.read, profile.locale, profile.layout),
          signal,
        ));
      const result = weapon || artifact || undefined;
      signal.throwIfAborted();
      const card = result?.layout;
      const r = card?.card ?? {
        x: frame.width * 0.65,
        y: frame.height * 0.08,
        width: frame.width * 0.3,
        height: frame.height * 0.78,
      };
      const evidence: ScanEvidence = {
        time,
        unsupportedOwner: result?.unsupportedOwner,
        issues: result?.issues ?? ["card"],
        image: preview(full.canvas, card?.thumbnail ?? r, 112),
        detail: preview(
          full.canvas,
          {
            ...r,
            height: Math.min(
              frame.height - r.y,
              Math.max(
                r.height,
                card?.equipped
                  ? card.equipped.y + card.equipped.height - r.y
                  : 0,
              ),
            ),
          },
          420,
        ),
      };
      return kind === "weapon"
        ? {
            ...evidence,
            kind,
            draft: weapon ? weapon.draft : {},
            rarity: weapon ? weapon.layout.rarity : segment.rarity,
          }
        : { ...evidence, kind, draft: artifact ? artifact.draft : {} };
    };
    for (const [i, segment] of segments.entries()) {
      let item = await readAt(segment.time, segment);
      if (item.issues.length && segment.time !== segment.alternate) {
        const alt = await readAt(segment.alternate, segment);
        if (alt.issues.length < item.issues.length) item = alt;
      }
      onItem(item);
      progress({ phase: "Reading cards", done: i + 1, total: segments.length });
    }
    return skipped;
  } finally {
    close();
    await ocr?.close();
  }
}
