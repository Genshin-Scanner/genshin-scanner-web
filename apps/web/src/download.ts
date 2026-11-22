import { downloadData, type Row } from "./review";

export function downloadArtifacts(rows: Row[]) {
  const data = downloadData(rows);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "genshin-artifacts.good.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
