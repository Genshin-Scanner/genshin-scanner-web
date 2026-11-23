import {
  inventoryDownloadData,
  inventoryScanReport,
  type CharacterEdits,
  type InventoryRow,
} from "./review";

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

export function downloadInventory(
  rows: InventoryRow[],
  characters: CharacterEdits,
) {
  downloadJson(
    inventoryDownloadData(rows, characters),
    "genshin-inventory.good.json",
  );
}

export function downloadScanReport(rows: InventoryRow[]) {
  downloadJson(inventoryScanReport(rows), "genshin-scan-report.json");
}
