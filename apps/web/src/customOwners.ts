import { customOwnerKeys, type CustomOwnerNames } from "@scanner/core";

const storageKey = "genshin-scanner.customOwners";

export function loadCustomOwners(): CustomOwnerNames {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? "{}",
    );
    if (!stored || typeof stored !== "object") return {};
    const names: CustomOwnerNames = {};
    for (const key of customOwnerKeys) {
      const value = (stored as Record<string, unknown>)[key];
      if (typeof value === "string") names[key] = value;
    }
    return names;
  } catch {
    return {};
  }
}

export function saveCustomOwners(names: CustomOwnerNames) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(names));
  } catch {
    // The current scan still uses the in-memory names if storage is disabled.
  }
}
