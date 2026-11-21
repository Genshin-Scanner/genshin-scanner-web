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
