import "server-only";
import ExcelJS from "exceljs";
import { dailyReport, parseRange, toCsv, topItems } from "./reports";
import { listOrders } from "./orders";
import { fmtBusinessDate, fmtDateTime } from "./format";
import { getSettings } from "./settings";

type Kind = "text" | "money" | "int";
type Col = { header: string; kind: Kind; width: number; total?: boolean };
type Cell = string | number | null;

export type ExportData = {
  type: string;
  title: string;
  from: string;
  to: string;
  cols: Col[];
  /** Nilai mentah, dipakai untuk CSV */
  rows: Cell[][];
  /** Nilai tampilan untuk Excel (tanggal lebih mudah dibaca); default = rows */
  xlsxRows?: Cell[][];
};

const STATUS: Record<string, string> = { paid: "Dibayar", void: "Dibatalkan", open: "Terbuka" };

/** Ambil data laporan sesuai query ?type=transactions|daily|top&from&to[&method] */
export async function buildExport(url: string): Promise<ExportData> {
  const { from, to, sp } = parseRange(url);
  const type = sp.get("type") ?? "transactions";

  if (type === "daily") {
    const days = await dailyReport(from, to);
    const rows = days.map((d) => [d.date, d.omzet, d.trxCount, d.cash, d.qris, d.voidCount]);
    return {
      type, from, to,
      title: "Rekap Harian",
      cols: [
        { header: "Tanggal Bisnis", kind: "text", width: 22 },
        { header: "Omzet", kind: "money", width: 16, total: true },
        { header: "Jumlah Transaksi", kind: "int", width: 18, total: true },
        { header: "Tunai", kind: "money", width: 16, total: true },
        { header: "QRIS", kind: "money", width: 16, total: true },
        { header: "Transaksi Dibatalkan", kind: "int", width: 21, total: true },
      ],
      rows,
      xlsxRows: rows.map((r) => [fmtBusinessDate(String(r[0])), ...r.slice(1)]),
    };
  }

  if (type === "top") {
    const items = await topItems(from, to, 500);
    return {
      type, from, to,
      title: "Menu Terlaris",
      cols: [
        { header: "No", kind: "int", width: 8 },
        { header: "Menu", kind: "text", width: 34 },
        { header: "Terjual", kind: "int", width: 10, total: true },
        { header: "Pendapatan", kind: "money", width: 16, total: true },
      ],
      rows: items.map((i, idx) => [idx + 1, i.name, i.qty, i.revenue]),
    };
  }

  const m = sp.get("method");
  const orders = await listOrders({
    status: ["paid", "void"],
    from,
    to,
    method: m === "cash" || m === "qris" ? m : undefined,
    limit: 100000,
  });
  const rows = orders.map((o) => [
    o.code,
    o.businessDate,
    o.paidAt ? fmtDateTime(o.paidAt) : "",
    o.tableLabel,
    o.customerName,
    o.itemCount,
    o.total,
    o.method === "cash" ? "Tunai" : o.method === "qris" ? "QRIS" : "",
    STATUS[o.status],
  ]);
  return {
    type, from, to,
    title: "Daftar Transaksi",
    cols: [
      { header: "No Struk", kind: "text", width: 18 },
      { header: "Tanggal Bisnis", kind: "text", width: 20 },
      { header: "Waktu Bayar", kind: "text", width: 18 },
      { header: "Meja", kind: "text", width: 8 },
      { header: "Pelanggan", kind: "text", width: 18 },
      { header: "Jumlah Item", kind: "int", width: 12 },
      { header: "Total", kind: "money", width: 14 },
      { header: "Metode", kind: "text", width: 10 },
      { header: "Status", kind: "text", width: 12 },
    ],
    rows,
    xlsxRows: rows.map((r) => [r[0], fmtBusinessDate(String(r[1])), ...r.slice(2)]),
  };
}

export const exportFileName = (d: ExportData, ext: string) => `laporan-${d.type}-${d.from}_${d.to}.${ext}`;

export function exportCsv(d: ExportData) {
  return toCsv(d.cols.map((c) => c.header), d.rows);
}

const MONEY_FMT = '"Rp "#,##0';
const BRAND = "FFD95C06";
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD6D3D1" } },
  bottom: { style: "thin", color: { argb: "FFD6D3D1" } },
  left: { style: "thin", color: { argb: "FFD6D3D1" } },
  right: { style: "thin", color: { argb: "FFD6D3D1" } },
};

/** File Excel berisi tabel sederhana: judul, periode, header berwarna, angka format rupiah, baris total. */
export async function exportXlsx(d: ExportData): Promise<Buffer> {
  const store = (await getSettings()).store_name;
  const wb = new ExcelJS.Workbook();
  wb.creator = store;
  const ws = wb.addWorksheet(d.title, { views: [{ state: "frozen", ySplit: 4 }] });
  const n = d.cols.length;
  ws.columns = d.cols.map((c) => ({ width: c.width }));

  // Judul + periode
  ws.mergeCells(1, 1, 1, n);
  ws.getCell(1, 1).value = `${d.title} — ${store}`;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, n);
  ws.getCell(2, 1).value =
    d.from === d.to ? `Periode: ${fmtBusinessDate(d.from)}` : `Periode: ${fmtBusinessDate(d.from)} s/d ${fmtBusinessDate(d.to)}`;
  ws.getCell(2, 1).font = { color: { argb: "FF78716C" } };

  // Header tabel (baris 4)
  const header = ws.getRow(4);
  d.cols.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle", horizontal: c.kind === "text" ? "left" : "right" };
    cell.border = BORDER;
  });
  header.height = 22;

  const data = d.xlsxRows ?? d.rows;
  data.forEach((r, ri) => {
    const row = ws.getRow(5 + ri);
    d.cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = r[i] ?? "";
      cell.border = BORDER;
      if (c.kind === "money") cell.numFmt = MONEY_FMT;
      if (c.kind !== "text") cell.alignment = { horizontal: "right" };
    });
  });

  if (data.length === 0) {
    ws.mergeCells(5, 1, 5, n);
    ws.getCell(5, 1).value = "Tidak ada data di periode ini";
    ws.getCell(5, 1).font = { italic: true, color: { argb: "FF78716C" } };
  } else if (d.cols.some((c) => c.total)) {
    // Baris total
    const tr = ws.getRow(5 + data.length);
    const first = 5, last = 4 + data.length;
    d.cols.forEach((c, i) => {
      const cell = tr.getCell(i + 1);
      const col = ws.getColumn(i + 1).letter;
      if (i === 0) cell.value = "TOTAL";
      else if (c.total) cell.value = { formula: `SUM(${col}${first}:${col}${last})`, result: data.reduce((a, r) => a + Number(r[i] ?? 0), 0) };
      if (c.kind === "money") cell.numFmt = MONEY_FMT;
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEECC7" } };
      cell.border = BORDER;
      if (c.kind !== "text") cell.alignment = { horizontal: "right" };
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
