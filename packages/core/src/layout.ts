import {
  bands,
  matches,
  type Pixels,
  type Rect,
  type ColorTest,
} from "./pixels";
export interface CardLayout {
  card: Rect;
  header: Rect;
  slotLabel?: Rect;
  mainLabel?: Rect;
  mainValue: Rect;
  level: Rect;
  stats: Rect;
  set: Rect;
  equipped?: Rect;
  thumbnail: Rect;
  rarity: number;
  lock: boolean;
}
export interface LayoutProfile {
  locate(frame: Pixels): CardLayout | undefined;
  /** Reference frame width for OCR on small recordings of this layout. */
  ocrWidth?: number;
}
const purple: ColorTest = (r, g, b) => b > 100 && b > r * 1.18 && r > g * 1.35;
const gold: ColorTest = (r, g, b) => r > 115 && r > g * 1.55 && g > b * 1.55;
const paper: ColorTest = (r, g, b) =>
  Math.abs(r - 234) < 13 && Math.abs(g - 227) < 13 && Math.abs(b - 216) < 13;
const green: ColorTest = (r, g, b) => g > 100 && g > r * 1.16 && g > b * 1.17;
const stars: ColorTest = (r, g, b) => r > 220 && g > 160 && g < 235 && b < 125;
function count(
  p: Pixels,
  y: number,
  left: number,
  right: number,
  test: ColorTest,
  step = 2,
) {
  let n = 0;
  for (let x = left; x < right; x += step) if (matches(p, x, y, test)) n++;
  return n;
}
export const pcLayout: LayoutProfile = {
  ocrWidth: 1920,
  locate(p) {
    const { width: w, height: h } = p;
    // Find the uninterrupted bottom stripe of the colored title bar.
    const left = Math.floor(w * 0.55);
    let bounds: [number, number] | undefined;
    let titleY = 0;
    for (let y = Math.floor(h * 0.06); y < h * 0.32; y += 2) {
      const runs = bands(
        left,
        w,
        (x) => matches(p, x, y, purple) || matches(p, x, y, gold),
        Math.floor(w * 0.15),
      );
      if (runs.length) {
        const best = runs.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a));
        if (!bounds || best[1] - best[0] >= bounds[1] - bounds[0] - 4) {
          bounds = best;
          titleY = y;
        }
      }
    }
    if (!bounds) {
      // Lower-rarity cards keep the same paper panel and star strip.
      const lowerTitle: ColorTest = (r, g, b) =>
        (b > 110 && b > r * 1.35 && g > r * 1.1) ||
        (g > 100 && g > r * 1.25 && g > b * 1.12) ||
        (r > 95 && r < 155 && Math.max(r, g, b) - Math.min(r, g, b) < 11);
      for (let y = Math.floor(h * 0.08); y < h * 0.21; y += 2) {
        const run = bands(
          left,
          w,
          (x) => matches(p, x, y, lowerTitle),
          Math.floor(w * 0.16),
        ).at(-1);
        if (run && run[1] - run[0] < w * 0.4) {
          bounds = run;
          titleY = y;
        }
      }
    }
    if (!bounds) return;
    let [x, right] = bounds,
      width = right - x;
    const body = bands(
      titleY + 1,
      h,
      (y) => matches(p, right - width * 0.025, y, paper),
      Math.ceil(h * 0.045),
    )[0];
    if (!body) return;
    const [bodyY, bodyEnd] = body;
    // Wrapped titles can break the colored stripe into two partial runs.
    // Recover the full panel width from the blank paper above the level badge.
    const paperEdge = bands(
      left,
      w,
      (i) =>
        matches(p, i, bodyY + Math.max(1, Math.round(width * 0.02)), paper),
      Math.floor(w * 0.15),
    ).find(([a, b]) => a <= x + 3 && Math.abs(b - right) <= width * 0.05);
    if (paperEdge) {
      [x, right] = paperEdge;
      width = right - x;
    }
    // A crafted artifact has a purple "Sanctifying Elixir Definition" banner
    // between its stars and the paper. Header fields stay above that banner.
    const elixir = bands(
      Math.max(titleY, bodyY - Math.ceil(width * 0.13)),
      bodyY,
      (y) =>
        matches(
          p,
          right - width * 0.035,
          y,
          (r, g, b) => b > 220 && b > g + 32 && r > g + 14,
        ),
      Math.ceil(width * 0.045),
    ).at(-1);
    const headerEnd =
      elixir && bodyY - elixir[1] < width * 0.018 ? elixir[0] : bodyY;
    const starRows = bands(
      titleY,
      headerEnd,
      (y) =>
        count(p, y, x + width * 0.04, x + width * 0.5, stars) > width * 0.045,
    );
    if (!starRows.length) return;
    const starRow = starRows.at(-1)!;
    const starY = Math.floor((starRow[0] + starRow[1]) / 2);
    const rarity = bands(
      x,
      Math.floor(x + width * 0.5),
      (i) => matches(p, i, starY, stars),
      Math.max(2, width * 0.011),
    ).length;
    const setRows = bands(
      bodyY,
      bodyEnd,
      (y) =>
        count(p, y, x + width * 0.045, right - width * 0.02, green) >
        width * 0.018,
      2,
    );
    if (!setRows.length) return;
    const setTop = setRows[0][0];
    const scale = width / 490;
    // A long set name wraps to a second green line before the set bonuses.
    let setBottom = setRows[0][1];
    for (const row of setRows.slice(1)) {
      if (row[0] - setBottom > 20 * scale || row[1] - setTop > 68 * scale)
        break;
      setBottom = row[1];
    }
    const rect = (dx: number, y: number, dw: number, height: number): Rect => ({
      x: x + dx * width,
      y,
      width: dw * width,
      height,
    });
    const level = rect(0.05, bodyY + 0.042 * width, 0.15, 0.083 * width);
    let red = 0;
    for (let y = level.y; y < level.y + level.height; y += 2)
      red += count(
        p,
        y,
        x + width * 0.72,
        x + width * 0.84,
        (r, g, b) => r > 195 && r > g * 1.45 && r > b * 1.5,
      );
    const equipRows = bands(
      bodyY,
      Math.min(h, bodyEnd + Math.ceil(width * 0.25)),
      (y) =>
        matches(
          p,
          right - width * 0.02,
          y,
          (r, g, b) => r > 241 && g > 208 && g < 242 && b > 150 && b < 205,
        ),
      5,
    );
    const equipped = equipRows.at(-1);
    return {
      card: rect(0, titleY, 1, bodyEnd - titleY),
      rarity,
      lock: red > width * 0.025,
      header: rect(0.045, titleY + 3, 0.53, starRow[0] - titleY - 5),
      slotLabel: rect(0.045, headerEnd - 0.45 * width, 0.5, 0.09 * width),
      mainLabel: rect(0.045, headerEnd - 0.28 * width, 0.57, 0.073 * width),
      mainValue: rect(0.045, headerEnd - 0.22 * width, 0.48, 0.12 * width),
      level,
      stats: rect(
        0.058,
        bodyY + 0.14 * width,
        0.93,
        setTop - bodyY - 0.14 * width - 2,
      ),
      set: rect(
        0.045,
        setTop - 5 * scale,
        0.94,
        setBottom - setTop + 11 * scale,
      ),
      thumbnail: rect(0.55, titleY + 4, 0.44, bodyY - titleY - 8),
      equipped: equipped
        ? rect(0.15, equipped[0], 0.84, equipped[1] - equipped[0])
        : undefined,
    };
  },
};
