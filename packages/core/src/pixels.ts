export interface Pixels {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type ColorTest = (r: number, g: number, b: number) => boolean;
export function matches(p: Pixels, x: number, y: number, test: ColorTest) {
  const i = 4 * (Math.floor(y) * p.width + Math.floor(x));
  return test(p.data[i], p.data[i + 1], p.data[i + 2]);
}
export function crop(p: Pixels, r: Rect): Pixels {
  const x = Math.max(0, Math.round(r.x)),
    y = Math.max(0, Math.round(r.y));
  const width = Math.max(0, Math.min(Math.round(r.width), p.width - x)),
    height = Math.max(0, Math.min(Math.round(r.height), p.height - y));
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const start = 4 * ((y + row) * p.width + x);
    data.set(p.data.subarray(start, start + 4 * width), row * width * 4);
  }
  return { data, width, height };
}
export function bands(
  start: number,
  end: number,
  active: (index: number) => boolean,
  minLength = 1,
): [number, number][] {
  const found: [number, number][] = [];
  let from = start;
  for (let i = start; i <= end; i++) {
    if (i < end && active(i)) continue;
    if (i - from >= minLength) found.push([from, i]);
    from = i + 1;
  }
  return found;
}
