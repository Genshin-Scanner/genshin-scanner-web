import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { statNumber } from "../packages/core/src/stat-digits";
import { crop, splitStatLines, type Pixels } from "../packages/core/src";

function paper(): Pixels {
  return {
    width: 100,
    height: 70,
    data: new Uint8Array(100 * 70 * 4).fill(235),
  };
}

function ink(image: Pixels, top: number, bottom: number, color = 70) {
  for (let y = top; y < bottom; y++)
    for (let x = 8; x < 70; x++) {
      const i = 4 * (y * image.width + x);
      image.data[i] = image.data[i + 1] = image.data[i + 2] = color;
      image.data[i + 3] = 255;
    }
}

test("separates substat lines while keeping detached letter strokes together", () => {
  const image = paper();
  ink(image, 8, 10);
  ink(image, 12, 20);
  ink(image, 35, 46);
  const lines = splitStatLines(image);
  expect(lines.map((x) => x.height)).toEqual([22, 21]);
  expect(lines.every((x) => x.width === 100)).toBe(true);
  expect(image.data[4 * (8 * 100 + 8)]).toBe(70);
});

test("retains gray unactivated text and numeric evidence", () => {
  const image = paper();
  ink(image, 10, 20, 160);
  expect(splitStatLines(image)).toHaveLength(1);
  expect(splitStatLines(image)[0].data).toContain(160);
});

test("empty paper has no text lines", () => {
  expect(splitStatLines(paper())).toEqual([]);
});

test("reads the complete values of annotated ATK, DEF and Elemental Mastery lines", () => {
  const fixture = PNG.sync.read(
    readFileSync(new URL("./fixtures/stat-lines.png", import.meta.url)),
  );
  const rows = splitStatLines(fixture);
  expect(rows.map((row) => statNumber(row)?.value)).toEqual([
    "11.1%",
    "11.7%",
    "21",
  ]);
  const noPlus = crop(rows[0], {
    x: 0,
    y: 0,
    width: 50,
    height: rows[0].height,
  });
  expect(statNumber(noPlus)).toBeUndefined();
});
