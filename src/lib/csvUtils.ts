/**
 * CSV utilities for exporting tabular data.
 *
 * Implements RFC 4180 escaping and an optional UTF-8 BOM for Excel-on-Windows
 * compatibility (smart quotes, em dashes, and accented characters render
 * correctly when the BOM is present).
 */

/**
 * Escape a single field value for inclusion in a CSV row.
 *
 * Handles:
 * - null / undefined → empty string
 * - numbers / booleans → stringified
 * - strings containing commas, double quotes, carriage returns, or newlines →
 *   wrapped in double quotes with internal double quotes doubled
 * - all other strings → returned as-is
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";

  const str = typeof value === "string" ? value : String(value);

  const needsQuoting = /[",\r\n]/.test(str);
  if (!needsQuoting) return str;

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Convert a header array and a 2D array of row values into a CSV string.
 *
 * Each row should have the same number of fields as the headers array; if
 * not, the shorter side wins (extra fields are dropped, missing fields
 * become empty).
 *
 * @param headers Column headers (first line of the CSV)
 * @param rows   Array of row arrays, each containing field values
 * @param options.bom If true (default), prepend a UTF-8 BOM (\uFEFF) so
 *                    Excel on Windows opens the file as UTF-8 and renders
 *                    smart quotes / em dashes / accents correctly. Set to
 *                    false for downstream parsers that don't strip the BOM.
 */
export function rowsToCsv(
  headers: string[],
  rows: unknown[][],
  options: { bom?: boolean } = {},
): string {
  const { bom = true } = options;

  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));

  const csv = [headerLine, ...dataLines].join("\r\n");

  return bom ? "\uFEFF" + csv : csv;
}

/**
 * Trigger a browser download of a CSV string as a file.
 *
 * Creates a Blob with the correct MIME type and charset, attaches a
 * temporary anchor element, programmatically clicks it, then revokes the
 * object URL on the next tick so the download completes before cleanup.
 *
 * Browser-only. Will throw or no-op in a non-DOM environment.
 *
 * @param filename Desired filename including .csv extension
 * @param csvContent The CSV string returned by rowsToCsv
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 0);
}
