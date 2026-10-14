/** Downloads rows as a CSV file that opens correctly in Excel and Google Sheets. */
export function downloadCSV(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? '' : String(v);
    // Stop spreadsheet apps from running a cell as a formula.
    if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const text = [header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
