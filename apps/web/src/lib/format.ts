export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** The short, sequential, human-quotable customer ID — "NXL-000123" — shown to the customer, admin, and partner. Distinct from the org's internal cuid (never shown) and its slug (derived from the workspace name, changes if renamed). */
export function formatCustomerCode(customerNumber: number): string {
  return `NXL-${String(customerNumber).padStart(6, "0")}`;
}
