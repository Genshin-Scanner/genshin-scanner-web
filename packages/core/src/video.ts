import { pcLayout, type LayoutProfile } from "./layout";
import { type Pixels, type Rect } from "./pixels";
export interface Mark {
  values: Uint8Array;
  column?: number;
  icon?: Uint8Array;
  grid?: Uint8Array;
  quality: number;
}
export interface Segment {
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
  if (!c || (c.rarity !== 4 && c.rarity !== 5)) return;
  const values: number[] = [];
  sample(p, c.thumbnail, 18, 20, values);
  sample(p, c.stats, 72, 22, values);
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
    grid: Uint8Array.from(grid),
    values: Uint8Array.from(values),
    quality: sum / values.length,
    ...selectedColumn(p, c.card),
  };
}
export function sameMark(a: Mark, b: Mark) {
  if (a.values.length !== b.values.length) return false;
  let differences = 0;
  for (let i = 0; i < a.values.length; i++)
    if (Math.abs(a.values[i] - b.values[i]) > 30) differences++;
  if (differences / a.values.length >= 0.025) return false;
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
  count: number;
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
      run.count++;
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
        count: 1,
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
      start: run.start,
      end: run.end,
      time: run.time,
      alternate: run.start,
    };
  }
  flush(): Segment | undefined {
    const last = this.run;
    this.run = undefined;
    this.pending = undefined;
    return last ? this.segment(last) : undefined;
  }
}
