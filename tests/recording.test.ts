import { expect, test } from "bun:test";
import { seekVideo } from "../packages/browser/src/recording";

class Video extends EventTarget {
  currentTime = 0;
  private nextId = 0;
  frames = new Map<number, VideoFrameRequestCallback>();

  requestVideoFrameCallback(callback: VideoFrameRequestCallback) {
    const id = this.nextId++;
    this.frames.set(id, callback);
    return id;
  }

  cancelVideoFrameCallback(id: number) {
    this.frames.delete(id);
  }

  present(mediaTime: number) {
    for (const [id, frame] of Array.from(this.frames)) {
      this.frames.delete(id);
      frame(0, { mediaTime } as VideoFrameCallbackMetadata);
    }
  }
}

test("a seek waits for presentation of the requested frame", async () => {
  const video = new Video();
  const signal = new AbortController().signal;
  let done = false;
  const pending = seekVideo(
    video as unknown as HTMLVideoElement,
    3,
    signal,
  ).then(() => {
    done = true;
  });
  video.dispatchEvent(new Event("seeked"));
  video.present(0);
  await Bun.sleep(0);
  expect(done).toBe(false);
  video.present(2.984);
  await pending;
  expect(done).toBe(true);
  expect(video.frames.size).toBe(0);
});

test("cancelling a paused seek releases its presentation callback", async () => {
  const video = new Video();
  const controller = new AbortController();
  const pending = seekVideo(
    video as unknown as HTMLVideoElement,
    3,
    controller.signal,
  );
  video.dispatchEvent(new Event("seeked"));
  await Bun.sleep(0);
  const reason = new Error("cancelled");
  controller.abort(reason);
  await expect(pending).rejects.toBe(reason);
  expect(video.frames.size).toBe(0);
});
