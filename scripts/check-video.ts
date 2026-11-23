import { readdirSync } from "node:fs";
import { join } from "node:path";
import { SegmentDetector, markFrame } from "../packages/core/src/index";
import assert from "node:assert/strict";
const width = 960,
  height = 600,
  fps = 10;
const video = Bun.spawn(
  [
    "ffmpeg",
    "-loglevel",
    "error",
    "-i",
    "test-assets/33-1/video.mp4",
    "-vf",
    `fps=${fps},scale=${width}:${height}`,
    "-pix_fmt",
    "rgba",
    "-f",
    "rawvideo",
    "pipe:1",
  ],
  { stdout: "pipe", stderr: "inherit" },
);
function fingerprint(p: Uint8Array) {
  const values = [];
  for (let y = 65; y < 320; y += 3)
    for (let x = 660; x < 890; x += 3) {
      const i = (y * width + x) * 4;
      values.push(p[i], p[i + 1], p[i + 2]);
    }
  return Uint8Array.from(values);
}
const dir = "test-assets/33-1/screenshots";
const refs = readdirSync(dir)
  .filter((f) => f.endsWith(".png"))
  .sort()
  .map((f) => {
    const proc = Bun.spawnSync(
      [
        "ffmpeg",
        "-loglevel",
        "error",
        "-i",
        join(dir, f),
        "-vf",
        "scale=960:600",
        "-pix_fmt",
        "rgba",
        "-f",
        "rawvideo",
        "pipe:1",
      ],
      { maxBuffer: 4e6 },
    );
    return fingerprint(proc.stdout);
  });
const fingerprints: Uint8Array[] = [];
function closest(p: Uint8Array) {
  const errors = refs.map((ref) => {
    let v = 0;
    for (let j = 0; j < ref.length; j++) v += Math.abs(ref[j] - p[j]);
    return v / ref.length;
  });
  return errors.indexOf(Math.min(...errors)) + 1;
}
const frame = new Uint8Array(width * height * 4);
let offset = 0,
  count = 0;
const detector = new SegmentDetector(),
  segments = [];
for await (const chunk of video.stdout) {
  let pos = 0;
  while (pos < chunk.length) {
    const n = Math.min(frame.length - offset, chunk.length - pos);
    frame.set(chunk.subarray(pos, pos + n), offset);
    pos += n;
    offset += n;
    if (offset !== frame.length) continue;
    fingerprints.push(fingerprint(frame));
    const mark = markFrame({ data: frame, width, height });
    const segment = detector.push(count / fps, mark);
    if (segment) segments.push(segment);
    count++;
    offset = 0;
  }
}
const last = detector.flush();
if (last) segments.push(last);
assert.equal(await video.exited, 0);
console.log(
  segments
    .map(
      (s) =>
        s.start.toFixed(1) +
        "–" +
        s.end.toFixed(1) +
        "#" +
        closest(fingerprints[Math.round(s.alternate * fps)]),
    )
    .join(" "),
);
console.log(segments.length + " artifact segments");
assert.equal(segments.length, 33);
assert.deepEqual(
  segments.map((s) => closest(fingerprints[Math.round(s.time * fps)])),
  refs.map((_, i) => i + 1),
);
