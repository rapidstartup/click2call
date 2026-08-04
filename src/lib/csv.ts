function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/^[=+\-@]/.test(text)) {
    return '"' + ("'" + text).replace(/"/g, '""') + '"';
  }
  if (/[",\n\r]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

export function buildCsv(
  headers: readonly string[],
  rows: ReadonlyArray<readonly unknown[]>,
): string {
  const lines = rows.map((row) => row.map(csvCell).join(','));
  return [headers.map(csvCell).join(','), ...lines].join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
