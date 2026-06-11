function esc(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}

/** Bangun CSV (CRLF antar baris). Sel di-escape sesuai RFC 4180. */
export function toCSV(headers: string[], rows: string[][]): string {
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) lines.push(row.map(esc).join(","));
  return lines.join("\r\n");
}
