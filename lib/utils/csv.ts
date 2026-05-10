/**
 * Convert an array of objects to a CSV string and trigger download.
 */
export function exportToCsv(rows: Record<string, string | number>[], filename: string): void {
  if (rows.length === 0) return;

  // Extract headers from first row
  const headers = Object.keys(rows[0]);

  // Build CSV content
  const csvLines = [
    // Header row
    headers.map(escapeCsvField).join(","),
    // Data rows
    ...rows.map((row) =>
      headers.map((h) => escapeCsvField(String(row[h] ?? ""))).join(",")
    ),
  ];

  const csvContent = csvLines.join("\n");

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape a CSV field value (handle commas, quotes, newlines).
 */
function escapeCsvField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
