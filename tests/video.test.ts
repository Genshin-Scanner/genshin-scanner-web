import { test, expect } from "bun:test";
import { SegmentDetector, type Mark } from "../packages/core/src";
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
