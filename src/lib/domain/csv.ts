/**
 * CSV domain formatting per 07-LOGIC.md §3e.
 * UTF-8 BOM (\uFEFF), CRLF line endings (\r\n), RFC-4180 quotes.
 */

export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) {
    return "";
  }
  const s = String(v);
  if (/[,"\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface SpendingCsvRow {
  spentOn: string;
  category: string;
  amount: number;
  note: string | null;
  createdBy: string;
}

export function formatSpendingCsv(rows: SpendingCsvRow[]): string {
  const header = ["date", "category", "amount_bdt", "note", "created_by"]
    .map(csvCell)
    .join(",");

  const lines = [header];
  for (const r of rows) {
    const line = [
      csvCell(r.spentOn),
      csvCell(r.category),
      csvCell(r.amount),
      csvCell(r.note),
      csvCell(r.createdBy),
    ].join(",");
    lines.push(line);
  }

  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

export interface IouCsvRow {
  occurredOn: string;
  personName: string;
  kind: string;
  amount: number;
  signed: number;
  balanceAfter: number;
  note: string | null;
  createdBy: string;
}

export function formatIousCsv(rows: IouCsvRow[]): string {
  const header = [
    "date",
    "person",
    "kind",
    "amount_bdt",
    "signed",
    "balance_after",
    "note",
    "created_by",
  ]
    .map(csvCell)
    .join(",");

  const lines = [header];
  for (const r of rows) {
    const line = [
      csvCell(r.occurredOn),
      csvCell(r.personName),
      csvCell(r.kind),
      csvCell(r.amount),
      csvCell(r.signed),
      csvCell(r.balanceAfter),
      csvCell(r.note),
      csvCell(r.createdBy),
    ].join(",");
    lines.push(line);
  }

  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
