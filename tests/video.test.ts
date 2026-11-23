import { test, expect } from "bun:test";
import { SegmentDetector, markFrame, type Mark } from "../packages/core/src";
const mark = (v: number, column?: number): Mark => ({
  quality: 3,
  column,
  values: new Uint8Array(10).fill(v),
});
test("ignores transient changes and separates equal items selected in adjacent columns", () => {
  const d = new SegmentDetector();
  const a = mark(20, 0),
    b = mark(20, 1);
  const out = [undefined, undefined, a, a, mark(200), a, b, b, b]
    .map((m, i) => d.push(i, m))
    .filter(Boolean);
  out.push(d.flush());
  expect(out.map((s) => s?.start)).toEqual([2, 6]);
});
test("a long menu interval ends an artifact selection", () => {
  const d = new SegmentDetector();
  d.push(0, mark(1));
  d.push(0.1, mark(1));
  expect(d.push(3, undefined)?.start).toBe(0);
  d.push(4, mark(1));
  d.push(4.1, mark(1));
  expect(d.flush()?.start).toBe(4);
});
test("OCR uses a settled frame for both attempts after a selection", () => {
  const d = new SegmentDetector();
  d.push(0, { ...mark(30), quality: 100 });
  d.push(0.1, mark(30));
  d.push(0.2, mark(30));
  d.push(0.3, mark(30));
  const segment = d.flush()!;
  expect(segment.time).toBeGreaterThanOrEqual(0.2);
  expect(segment.alternate).toBeGreaterThanOrEqual(0.2);
});

test("a one-pixel compression change on one paper scanline preserves the card fingerprint", () => {
  const width = 400,
    height = 240;
  const frame = { width, height, data: new Uint8Array(width * height * 4) };
  for (let i = 0; i < frame.data.length; i += 4)
    frame.data[i] = ((i / 4) % 7) * 40;
  const paper = (x: number, y: number) =>
    frame.data.set([234, 227, 216, 255], (y * width + x) * 4);
  for (let y = 121; y <= 128; y++) for (let x = 210; x < 390; x++) paper(x, y);
  const card = { x: 210, y: 40, width: 180, height: 170 };
  const layout = {
    locate: () => ({
      card,
      rarity: 5,
      level: { ...card, y: 128 },
      lock: false,
      thumbnail: card,
      header: card,
      mainValue: card,
      stats: card,
      set: card,
    }),
  };
  const original = markFrame(frame, layout);
  expect(original).toBeDefined();
  frame.data[(122 * width + 389) * 4] = 0;
  expect(markFrame(frame, layout)?.values).toEqual(original!.values);
});
test("separates identical icons when several independent substat lines change", () => {
  const values = new Uint8Array(18 * 20 + 24 * 10 + 72 * 22);
  const before = { values, quality: 1 };
  const after = { values: values.slice(), quality: 1 };
  for (const row of [2, 7, 12])
    after.values.fill(40, 600 + row * 72, 600 + row * 72 + 8);
  const d = new SegmentDetector();
  const segments = [before, before, after, after]
    .map((m, i) => d.push(i * 0.1, m))
    .filter(Boolean);
  expect([...segments, d.flush()].map((s) => s?.start)).toEqual([0, 0.2]);
});
