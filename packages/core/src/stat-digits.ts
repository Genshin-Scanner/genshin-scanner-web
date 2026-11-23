import { bands, type Pixels, type Rect } from "./pixels";

// Median aspect ratio and 6 × 8 ink coverage of isolated PC stat glyphs.
// Each hexadecimal digit records coverage from 0 (paper) to 15 (ink).
const shapes: Record<string, [number, string]> = {
  "%": [1.05, "8d30b3d483c0f4ad60598d4200f89d06d54a0c355c590085"],
  ".": [1.25, "0ffff00ffff0ffffffffffffffffffffffff0ffff00ffff0"],
  "0": [0.79, "08ff807f33d5af00afcd00afdf00afaf00af7f33d508ff80"],
  "1": [0.39, "0048ff5affff008fff008fff008fff008fff008ff8008f80"],
  "2": [0.68, "08ff90af33fdfd00ff000af8008d400bf000bfa558ffffff"],
  "3": [0.68, "0bffb0dd33fd4400fb00adf30004ff8400ffad55fd08ff80"],
  "4": [0.84, "003f8000af80088f802d0f80ab8fb5fffffd000f80000d00"],
  "5": [0.74, "0afff40f55500d00005dadc30000fb8300afaa03da0dffa0"],
  "6": [0.74, "004b5005e3002f40008faad8fa00affa00af5f30cd0affd4"],
  "7": [0.74, "8fffff5555f30008a0004f7000bf3000ff0005fa0005f400"],
  "8": [0.74, "0dffd08c00c88f40f83dffd0bf48fbfa00afdc00cd0affa0"],
  "9": [0.68, "2bff90df33fdff008fff33df4bfbff0008f4003f8000b400"],
};
const templates = Object.entries(shapes).map(([char, [ratio, cells]]) => ({
  char,
  ratio,
  cells: Array.from(cells, (cell) => parseInt(cell, 16) / 15),
}));

type Ink = (x: number, y: number) => boolean;

function isPlus(r: Rect, ink: Ink) {
  const { x, y, width: w, height: h } = r;
  if (h < 7 || w / h < 0.75 || w / h > 1.35) return false;
  if (
    ink(x, y) ||
    ink(x + w - 1, y) ||
    ink(x, y + h - 1) ||
    ink(x + w - 1, y + h - 1)
  )
    return false;
  let horizontal = 0,
    vertical = 0;
  for (let i = 0; i < w; i++)
    horizontal += Number(ink(x + i, y + Math.floor(h / 2)));
  for (let i = 0; i < h; i++)
    vertical += Number(ink(x + Math.floor(w / 2), y + i));
  return horizontal >= 0.9 * w && vertical >= 0.9 * h;
}

function classify(r: Rect, ink: Ink, referenceHeight: number) {
  const cells: number[] = [];
  for (let row = 0; row < 8; row++) {
    const y = r.y + Math.min(r.height - 1, Math.round((row * r.height) / 8));
    const endY = Math.max(y + 1, r.y + Math.round(((row + 1) * r.height) / 8));
    for (let col = 0; col < 6; col++) {
      const x = r.x + Math.min(r.width - 1, Math.round((col * r.width) / 6));
      const endX = Math.max(x + 1, r.x + Math.round(((col + 1) * r.width) / 6));
      let pixels = 0;
      for (let j = y; j < endY; j++)
        for (let i = x; i < endX; i++) pixels += Number(ink(i, j));
      cells.push(pixels / ((endX - x) * (endY - y)));
    }
  }
  const ranked = templates
    .filter((t) => (t.char === ".") === r.height < referenceHeight * 0.6)
    .map((t) => {
      const error =
        cells.reduce((sum, v, i) => sum + Math.abs(v - t.cells[i]), 0) /
        cells.length;
      return {
        char: t.char,
        score: error + 0.18 * Math.abs(Math.log(r.width / r.height / t.ratio)),
      };
    })
    .sort((a, b) => a.score - b.score);
  if (
    ranked[0]?.score < 0.3 &&
    (!ranked[1] || ranked[1].score - ranked[0].score > 0.035)
  )
    return ranked[0].char;
}

function glyphBoxes(width: number, height: number, ink: Ink) {
  const columns = bands(0, width, (x) => {
    for (let y = 0; y < height; y++) if (ink(x, y)) return true;
    return false;
  });
  return columns.map(([left, right]) => {
    let top = height,
      bottom = 0;
    for (let x = left; x < right; x++)
      for (let y = 0; y < height; y++)
        if (ink(x, y)) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y + 1);
        }
    return { x: left, y: top, width: right - left, height: bottom - top };
  });
}

/** Read a complete numeric suffix. Leave touching glyphs and inactive text to OCR. */
function readAtThreshold(line: Pixels, threshold: number) {
  const { width, height, data } = line;
  const ink: Ink = (x, y) => {
    const i = 4 * (y * width + x);
    return (
      data[i] < threshold &&
      data[i + 1] < threshold &&
      data[i + 2] < threshold + 5
    );
  };
  const boxes = glyphBoxes(width, height, ink);
  const plusIndex = boxes.findIndex((box) => isPlus(box, ink));
  if (plusIndex < 1) return;
  const plus = boxes[plusIndex],
    digits = boxes.slice(plusIndex + 1);
  if (!digits.length || digits.length > 6) return;
  let value = "";
  for (const digit of digits) {
    const char = classify(digit, ink, plus.height);
    if (!char) return;
    value += char;
  }
  if (/^(?:\d{1,4}|\d{1,2}\.\d%)$/.test(value))
    return { labelWidth: plus.x, value };
}

export function statNumber(line: Pixels) {
  return (
    readAtThreshold(line, 160) ??
    readAtThreshold(line, 135) ??
    readAtThreshold(line, 180)
  );
}

export function mainNumber(line: Pixels) {
  const { width, height, data } = line;
  const ink: Ink = (x, y) => {
    const i = 4 * (y * width + x);
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    return (
      Math.min(r, g, b) > 190 && Math.max(r, g, b) - Math.min(r, g, b) < 45
    );
  };
  const boxes = glyphBoxes(width, height, ink);
  if (boxes.length < 2 || boxes.length > 6) return;
  const largest = Math.max(...boxes.map((box) => box.height));
  if (largest < height * 0.35) return;
  let value = "";
  for (const box of boxes) {
    const char = classify(box, ink, largest);
    if (!char) return;
    value += char;
  }
  if (/^(?:\d{1,4}|\d{1,2}\.\d%)$/.test(value)) return value;
}
