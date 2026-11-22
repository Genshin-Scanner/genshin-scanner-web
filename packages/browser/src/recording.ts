import { ScanError } from "./error";
import { abortable } from "./abort";

export const recordingAccept =
  ".mp4,.webm,.mkv,video/mp4,video/webm,video/x-matroska,video/matroska";

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
            "The browser could not decode this video track.",
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

export async function openRecording(
  file: File,
  signal: AbortSignal,
  preparing: () => void,
) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  let url: string | undefined;

  function close() {
    video.removeAttribute("src");
    video.load();
    if (url) URL.revokeObjectURL(url);
    url = undefined;
  }

  async function seek(time: number) {
    signal.throwIfAborted();
    if (Math.abs(time - video.currentTime) <= 0.0001) return;
    await videoEvent(video, "seeked", signal, () => {
      video.currentTime = time;
    });
    if (Math.abs(video.currentTime - time) > 0.1)
      throw new ScanError(
        "seek",
        "The player could not seek to the requested frame.",
      );
  }

  async function load(blob: Blob) {
    signal.throwIfAborted();
    url = URL.createObjectURL(blob);
    await videoEvent(video, "loadeddata", signal, () => {
      video.src = url!;
      video.load();
    });
    if (!video.videoWidth || !video.videoHeight)
      throw new ScanError(
        "track",
        "The recording has no readable video track.",
      );
    if (!Number.isFinite(video.duration) || video.duration <= 0)
      throw new ScanError("seek", "The recording has no finite duration.");
    await seek(video.duration / 2);
    await seek(0);
  }

  try {
    try {
      await load(file);
    } catch (nativeError) {
      signal.throwIfAborted();
      const header = await file.slice(0, 4).arrayBuffer();
      if (
        header.byteLength !== 4 ||
        new DataView(header).getUint32(0) !== 0x1a45dfa3
      )
        throw nativeError;

      close();
      preparing();
      const { remuxRecording } = await abortable(import("./remux"), signal);
      const playable = await remuxRecording(file, signal);
      await load(playable);
    }
    return { video, seek, close };
  } catch (error) {
    close();
    throw error;
  }
}
