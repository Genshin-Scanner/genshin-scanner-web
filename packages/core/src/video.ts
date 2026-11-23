import { pcLayout, type LayoutProfile } from "./layout";
import {
  bands,
  matches,
  type Pixels,
  type Rect,
  type ColorTest,
} from "./pixels";
export interface Mark {
  rarity?: number;
  values: Uint8Array;
  column?: number;
  icon?: Uint8Array;
  grid?: Uint8Array;
  quality: number;
}
export interface Segment {
  rarity?: number;
  start: number;
  end: number;
  time: number;
  alternate: number;
}
function grey(p: Pixels, x: number, y: number) {
  const i = 4 * (Math.floor(y) * p.width + Math.floor(x));
  return (p.data[i] + p.data[i + 1] + p.data[i + 2]) / 3;
}
function sample(p: Pixels, r: Rect, cols: number, rows: number, out: number[]) {
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      let total = 0;
      for (const dx of [0.25, 0.75])
        for (const dy of [0.25, 0.75])
          total += grey(
            p,
            r.x + ((x + dx) * r.width) / cols,
            r.y + ((y + dy) * r.height) / rows,
          );
      out.push(total / 4);
    }
}
function selectedColumn(p: Pixels, r: Rect) {
  // The selected tile has a diffuse glow outside its vertical border. Hover has a thin, sharp outline.
  let tile: { column: number; icon: Uint8Array } | undefined;
  for (let col = 0; col < 8; col++) {
    const edge = r.x - r.width * (2.425 - col * 0.298);
    if (edge < r.width * 0.04 || edge >= p.width) continue;
    let score = 0,
      run = 0,
      centerY = 0;
    for (let y = p.height * 0.15; y < p.height * 0.89; y += 2) {
      const near = grey(p, edge - r.width * 0.009, y),
        far = grey(p, edge - r.width * 0.023, y);
      const bright = Math.max(
        grey(p, edge, y),
        grey(p, edge - 1, y),
        grey(p, edge + 1, y),
      );
      if (near > far + 24 && near < 239 && bright > 188) {
        run++;
        if (run > score) {
          score = run;
          centerY = y - run;
        }
      } else run = 0;
    }
    if (score > r.width * 0.046) {
      if (tile) return;
      const pixels: number[] = [];
      sample(
        p,
        {
          x: edge + r.width * 0.04,
          y: centerY - r.width * 0.105,
          width: r.width * 0.18,
          height: r.width * 0.17,
        },
        10,
        10,
        pixels,
      );
      tile = {
        column: 8 * Math.floor(centerY / (r.width * 0.36)) + col,
        icon: Uint8Array.from(pixels),
      };
    }
  }
  return tile;
}
export function markFrame(
  p: Pixels,
  profile: LayoutProfile = pcLayout,
): Mark | undefined {
  const c = profile.locate(p);
  if (!c || c.rarity < 1 || c.rarity > 5) return;
  const values: number[] = [];
  // Re-anchor at the blank strip above the level badge. A one-pixel wobble in a tinted
  // title or in the green letters would otherwise move every sample on compressed video.
  const bodyY = Math.round(c.level.y - c.card.width * 0.042);
  // A codec can shift one scanline at the paper edge by a pixel. Use a majority
  // across three rows of the blank strip so every text sample keeps its anchor.
  const paper: ColorTest = (r, g, b) =>
    Math.abs(r - 234) < 15 && Math.abs(g - 227) < 15 && Math.abs(b - 216) < 15;
  const rows = [0.008, 0.02, 0.032].map(
    (offset) => bodyY + Math.max(1, Math.round(c.card.width * offset)),
  );
  const strip = bands(
    Math.floor(p.width * 0.5),
    p.width,
    (x) => {
      const first = matches(p, x, rows[0], paper);
      const second = matches(p, x, rows[1], paper);
      return first === second ? first : matches(p, x, rows[2], paper);
    },
    Math.floor(p.width * 0.15),
  ).at(-1);
  if (!strip) return;
  const [left, right] = strip,
    w = right - left;
  sample(
    p,
    {
      x: left + w * 0.55,
      y: bodyY - w * 0.44,
      width: w * 0.44,
      height: w * 0.42,
    },
    18,
    20,
    values,
  );
  sample(
    p,
    {
      x: left + w * 0.05,
      y: bodyY - w * 0.29,
      width: w * 0.44,
      height: w * 0.21,
    },
    24,
    10,
    values,
  );
  sample(
    p,
    {
      x: left + w * 0.06,
      y: bodyY + w * 0.14,
      width: w * 0.91,
      height: w * 0.34,
    },
    72,
    22,
    values,
  );
  let sum = 0;
  for (let i = 1; i < values.length; i++)
    sum += Math.abs(values[i] - values[i - 1]);
  const grid: number[] = [];
  sample(
    p,
    {
      x: p.width * 0.07,
      y: p.height * 0.16,
      width: c.card.x - p.width * 0.1,
      height: p.height * 0.68,
    },
    32,
    24,
    grid,
  );
  return {
    rarity: c.rarity,
    grid: Uint8Array.from(grid),
    values: Uint8Array.from(values),
    quality: sum / values.length,
    ...selectedColumn(p, c.card),
  };
}
// The first two samples cover the icon and main stat. Changes spread across
// several substat lines can identify two plumes with the same icon and main stat.
function changedStatLines(a: Uint8Array, b: Uint8Array) {
  const offset = 18 * 20 + 24 * 10,
    columns = 72,
    rows = 22;
  if (a.length !== offset + columns * rows) return false;
  let changedLines = 0,
    previousRow = -3;
  for (let row = 0; row < rows; row++) {
    let changed = 0;
    for (let col = 0; col < columns; col++) {
      const i = offset + row * columns + col;
      if (Math.abs(a[i] - b[i]) > 24) changed++;
    }
    if (changed >= 4) {
      if (row - previousRow >= 3) changedLines++;
      previousRow = row;
    }
  }
  return changedLines >= 3;
}
export function sameMark(a: Mark, b: Mark) {
  if (a.values.length !== b.values.length) return false;
  let differences = 0;
  for (let i = 0; i < a.values.length; i++)
    if (Math.abs(a.values[i] - b.values[i]) > 30) differences++;
  if (
    differences / a.values.length >= 0.025 ||
    changedStatLines(a.values, b.values)
  )
    return false;
  if (a.column === undefined || b.column === undefined || a.column === b.column)
    return true;
  if (!a.icon || !b.icon) return false;
  let delta = 0;
  for (let i = 0; i < a.icon.length; i++)
    delta += Math.abs(a.icon[i] - b.icon[i]);
  return delta / a.icon.length > 12;
}
type Run = {
  mark: Mark;
  start: number;
  end: number;
  alternate?: number;
  time: number;
  quality: number;
};
export class SegmentDetector {
  private run?: Run;
  private pending?: Run;
  private previousGrid?: Uint8Array;
  private scrolling = false;
  push(time: number, mark: Mark | undefined): Segment | undefined {
    if (!mark) {
      this.pending = undefined;
      this.scrolling = true;
      if (this.run && time - this.run.end > 1.5) return this.flush();
      return;
    }
    if (this.previousGrid && mark.grid) {
      let changed = 0;
      for (let i = 0; i < mark.grid.length; i++)
        if (Math.abs(mark.grid[i] - this.previousGrid[i]) > 16) changed++;
      if (changed > mark.grid.length * 0.07) this.scrolling = true;
    }
    this.previousGrid = mark.grid;
    const update = (run: Run) => {
      run.end = time;
      if (time - run.start >= 0.15 && run.alternate === undefined) {
        run.alternate = time;
        run.quality = -Infinity;
      }
      if (mark.quality >= run.quality) {
        run.time = time;
        run.quality = mark.quality;
      }
    };
    if (
      this.run &&
      sameMark(
        {
          ...this.run.mark,
          column:
            this.scrolling || time - this.run.start < 0.5
              ? undefined
              : this.run.mark.column,
        },
        mark,
      )
    ) {
      if (time - this.run.start < 0.5) {
        this.run.mark.column = mark.column;
        this.run.mark.icon = mark.icon;
      }
      update(this.run);
      this.pending = undefined;
      return;
    }
    if (!this.pending || !sameMark(this.pending.mark, mark)) {
      this.pending = {
        start: time,
        end: time,
        mark,

        time,
        quality: mark.quality,
      };
      return;
    }
    update(this.pending);
    const finished = this.run ? this.segment(this.run) : undefined;
    this.scrolling = false;
    this.run = this.pending;
    this.pending = undefined;
    return finished;
  }
  private segment(run: Run): Segment {
    return {
      rarity: run.mark.rarity,
      start: run.start,
      end: run.end,
      time: run.time,
      alternate: run.alternate ?? run.end,
    };
  }
  flush(): Segment | undefined {
    const last = this.run;
    this.run = undefined;
    this.pending = undefined;
    return last ? this.segment(last) : undefined;
  }
}
