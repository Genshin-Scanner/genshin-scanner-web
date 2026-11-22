import { ScanError } from "./error";
import { abortable } from "./abort";
import {
  markFrame,
  SegmentDetector,
  recognizeArtifact,
  pcLayout,
  english,
  type LocaleProfile,
  type LayoutProfile,
  type Pixels,
  type Mark,
  type Segment,
  type Rect,
} from "@scanner/core";
import type { ArtifactDraft } from "@scanner/good";
import { openBrowserOcr } from "./ocr";
export interface ScanProfile {
  locale: LocaleProfile;
  layout: LayoutProfile;
  mark: (frame: Pixels) => Mark | undefined;
}
export interface ScanItem {
  time: number;
  draft: ArtifactDraft;
  issues: string[];
  image: string;
  detail: string;
}
export type ScanProgress = {
  phase: "Finding cards" | "Reading cards";
  done: number;
  total: number;
};
function videoEvent(
  video: HTMLVideoElement,
  event: string,
  signal: AbortSignal,
  action: () => void,
) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const listeners = new AbortController();
    const cleanup = () => {
      listeners.abort();
      signal.removeEventListener("abort", cancel);
      clearTimeout(timer);
    };
    const fail = (err: unknown) => {
      cleanup();
      reject(err);
    };
    const cancel = () => fail(signal.reason);
    const timer = setTimeout(
      () => fail(new ScanError("timeout", "Video decoder timed out.")),
      30000,
    );
    signal.addEventListener("abort", cancel, { once: true });
    video.addEventListener(
      "error",
      () =>
        fail(
          new ScanError(
            "decode",
            "This browser could not decode the recording. Choose MP4 with H.264 video.",
          ),
        ),
      { signal: listeners.signal },
    );
    video.addEventListener(
      event,
      () => {
        cleanup();
        resolve();
      },
      { signal: listeners.signal },
    );
    try {
      action();
    } catch (e) {
      fail(e);
    }
  });
}
function canvas(width: number, height: number) {
  const el = document.createElement("canvas");
  el.width = Math.max(1, Math.round(width));
  el.height = Math.max(1, Math.round(height));
  const ctx = el.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new ScanError("canvas", "Canvas 2D unavailable");
  return ctx;
}
function preview(video: HTMLVideoElement, r: Rect, maxWidth: number) {
  const width = Math.min(r.width, maxWidth),
    ctx = canvas(width, (r.height * width) / r.width);
  ctx.drawImage(
    video,
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
  profile: ScanProfile = { locale: english, layout: pcLayout, mark: markFrame },
) {
  const url = URL.createObjectURL(file),
    video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  let ocr: Awaited<ReturnType<typeof openBrowserOcr>> | undefined;
  try {
    await videoEvent(video, "loadeddata", signal, () => {
      video.src = url;
      video.load();
    });
    if (
      !Number.isFinite(video.duration) ||
      video.duration <= 0 ||
      !video.videoWidth
    )
      throw new ScanError(
        "track",
        "The recording has no readable video track.",
      );
    const seek = async (time: number) => {
      signal.throwIfAborted();
      if (Math.abs(time - video.currentTime) > 0.0001)
        await videoEvent(video, "seeked", signal, () => {
          video.currentTime = time;
        });
    };
    const width = Math.min(video.videoWidth, 960),
      small = canvas(width, (video.videoHeight * width) / video.videoWidth);
    const detected: Segment[] = [];
    const d = new SegmentDetector();
    const steps = Math.ceil(video.duration * 10);
    for (let i = 0; i < steps; i++) {
      await seek(i / 10);
      small.drawImage(video, 0, 0, small.canvas.width, small.canvas.height);
      const frame = small.getImageData(
        0,
        0,
        small.canvas.width,
        small.canvas.height,
      );
      const s = d.push(i / 10, profile.mark(frame));
      if (s) detected.push(s);
      progress({ phase: "Finding cards", done: i + 1, total: steps });
    }
    const last = d.flush();
    if (last) detected.push(last);
    const segments = detected.filter((s) => s.rarity === 4 || s.rarity === 5);
    const skipped = detected.length - segments.length;
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
    const full = canvas(video.videoWidth, video.videoHeight);
    const readAt = async (time: number): Promise<ScanItem> => {
      await seek(time);
      full.drawImage(video, 0, 0);
      const frame = full.getImageData(
        0,
        0,
        video.videoWidth,
        video.videoHeight,
      );
      const card = profile.layout.locate(frame);
      const result = await abortable(
        recognizeArtifact(frame, ocr!.read, profile.locale, profile.layout),
        signal,
      );
      signal.throwIfAborted();
      const r = card?.card ?? {
        x: frame.width * 0.65,
        y: frame.height * 0.08,
        width: frame.width * 0.3,
        height: frame.height * 0.78,
      };
      return {
        time,
        draft: result?.draft ?? {},
        issues: result?.issues ?? ["card"],
        image: preview(video, card?.thumbnail ?? r, 112),
        detail: preview(
          video,
          {
            ...r,
            height: Math.min(
              frame.height - r.y,
              r.height + (card?.equipped?.height ?? 0),
            ),
          },
          420,
        ),
      };
    };
    for (const [i, segment] of segments.entries()) {
      let item = await readAt(segment.time);
      if (item.issues.length && segment.time !== segment.alternate) {
        const alt = await readAt(segment.alternate);
        if (alt.issues.length < item.issues.length) item = alt;
      }
      onItem(item);
      progress({ phase: "Reading cards", done: i + 1, total: segments.length });
    }
    return skipped;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
    await ocr?.close();
  }
}
