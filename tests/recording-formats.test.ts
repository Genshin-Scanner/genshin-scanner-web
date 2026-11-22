import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { remuxRecording } from "../packages/browser/src/remux";

const fixture = (name: string) =>
  Bun.file(new URL("./fixtures/" + name, import.meta.url));

test("Matroska remux preserves the compressed H.264 packets and drops audio", async () => {
  const result = await remuxRecording(
    fixture("h264-audio.mkv"),
    new AbortController().signal,
  );
  const bytes = Buffer.from(await result.arrayBuffer());
  expect(result.type).toBe("video/mp4");
  expect(bytes.includes(Buffer.from("vide"))).toBe(true);
  expect(bytes.includes(Buffer.from("soun"))).toBe(false);
  // Hash of the source video packets from ffmpeg -map 0:v -c copy -f hash.
  const packetBytes = 1128 + 68 + 463 + 60; // Four packet sizes reported by ffprobe.
  let packetHash: string | undefined;
  for (let pos = 0; pos + 8 <= bytes.length; ) {
    const size = bytes.readUInt32BE(pos);
    expect(size).toBeGreaterThanOrEqual(8);
    if (bytes.toString("ascii", pos + 4, pos + 8) === "mdat")
      packetHash = createHash("sha256")
        .update(bytes.subarray(pos + size - packetBytes, pos + size))
        .digest("hex");
    pos += size;
  }
  expect(packetHash).toBe(
    "b28a008686d1df2f8046ccb47e39bec4ede7d4d1655b97c258debe017f1c2ba1",
  );
});

test("streaming VP8 WebM acquires a duration and seek cues", async () => {
  const original = fixture("unindexed-vp8.webm");
  const result = await remuxRecording(original, new AbortController().signal);
  expect(result.type).toBe("video/webm");
  const cues = Buffer.from("1c53bb6b", "hex");
  expect(Buffer.from(await original.arrayBuffer()).includes(cues)).toBe(false);
  const rebuilt = Buffer.from(await result.arrayBuffer());
  expect(rebuilt.includes(cues)).toBe(true);
  expect(rebuilt.includes(Buffer.from("V_VP8"))).toBe(true);
});

test("damaged containers report a media error and cancellation preserves its reason", async () => {
  const damaged = new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])]);
  await expect(
    remuxRecording(damaged, new AbortController().signal),
  ).rejects.toMatchObject({ code: "container" });
  const controller = new AbortController();
  const pending = remuxRecording(fixture("h264-audio.mkv"), controller.signal);
  const reason = new Error("stop");
  controller.abort(reason);
  await expect(pending).rejects.toBe(reason);
});
