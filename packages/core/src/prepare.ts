import type { Field } from "./index";
import type { Pixels } from "./pixels";
// The upstream scanner separates the header, paper and green set heading before OCR.
export function prepareText(image: Pixels, field: Field): Pixels {
  if (field === "mainValue") return image;
  const pad = 12,
    scale = 2,
    width = image.width * scale + pad * 2,
    height = image.height * scale + pad * 2;
  const data = new Uint8Array(width * height * 4).fill(255);
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const i = 4 * (y * image.width + x);
      const [r, g, b] = [image.data[i], image.data[i + 1], image.data[i + 2]];
      let ink: boolean;
      switch (field) {
        case "header":
          ink =
            r > 165 &&
            g > 155 &&
            b > 145 &&
            Math.max(r, g, b) - Math.min(r, g, b) < 52;
          break;
        case "level":
          ink = r > 223 && g > 225 && b > 224;
          break;
        case "set":
          ink = g > r * 1.12 && g > b * 1.12;
          break;
        default:
          ink = r < 178 && g < 178 && b < 180;
          break;
      }
      if (!ink) continue;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const j = 4 * ((y * scale + pad + dy) * width + x * scale + pad + dx);
          data[j] = data[j + 1] = data[j + 2] = 0;
        }
    }
  return { width, height, data };
}
