import { downloadData, scanReport, type Row } from "./review";

function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadArtifacts(rows: Row[]) {
  downloadJson(downloadData(rows), "genshin-artifacts.good.json");
}

export function downloadScanReport(rows: Row[]) {
  downloadJson(scanReport(rows), "genshin-scan-report.json");
}
