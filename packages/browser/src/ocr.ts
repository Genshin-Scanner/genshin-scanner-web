import { ScanError } from "./error";
import { createWorker, PSM } from "tesseract.js";
import { prepareText, type Ocr } from "@scanner/core";
export async function openBrowserOcr(assetBase: URL, language = "eng") {
  const base = assetBase.href.replace(/\/$/, "");
  const worker = await createWorker(language, 1, {
    langPath: base,
    corePath: base,
    workerPath: base + "/worker.min.js",
  });
  const read: Ocr = async (image, field) => {
    const p = prepareText(image, field);
    const canvas = document.createElement("canvas");
    canvas.width = p.width;
    canvas.height = p.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ScanError("canvas", "Canvas 2D unavailable");
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(p.data), p.width, p.height),
      0,
      0,
    );
    let tessedit_char_whitelist = "+0123456789";
    if (field !== "level") {
      tessedit_char_whitelist =
        field === "mainValue" || field === "mainValueMask"
          ? "0123456789,.%"
          : "";
    }
    await worker.setParameters({
      tessedit_pageseg_mode:
        field === "header" || field === "stats" || field === "set"
          ? PSM.SINGLE_BLOCK
          : PSM.SINGLE_LINE,
      tessedit_char_whitelist,
    });
    return (await worker.recognize(canvas)).data.text;
  };
  return { read, close: () => worker.terminate() };
}
