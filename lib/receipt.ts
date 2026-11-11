// Penyusun struk 58mm (32 karakter/baris) + konversi ke perintah ESC/POS.
// Dipakai untuk pratinjau di layar dan untuk dikirim ke printer Bluetooth.
import { fmtDateTime, rupiah } from "./format";
import type { OrderDetail, StoreInfo } from "./types";

export const WIDTH = 32;

export type ReceiptLine = { text: string; align?: "left" | "center"; bold?: boolean; big?: boolean };

/** Ubah ke ASCII supaya aman di code page bawaan printer thermal. */
export function ascii(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "?");
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (w.length > width) {
      if (cur) lines.push(cur);
      for (let i = 0; i < w.length; i += width) lines.push(w.slice(i, i + width));
      cur = lines.pop() ?? "";
      continue;
    }
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= width) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/** Teks kiri + angka rata kanan. Teks panjang dibungkus, angka di baris terakhir. */
function leftRight(left: string, right: string, indent = 0): string[] {
  const pad = " ".repeat(indent);
  const avail = WIDTH - right.length - 1;
  const parts = wrap(left, avail - indent);
  return parts.map((p, i) => {
    const l = (i === 0 ? pad : pad + "  ") + p;
    if (i < parts.length - 1) return l;
    return l + " ".repeat(Math.max(1, WIDTH - l.length - right.length)) + right;
  });
}

const sep = (): ReceiptLine => ({ text: "-".repeat(WIDTH) });
const L = (text: string): ReceiptLine => ({ text: ascii(text) });

export function buildReceipt(order: OrderDetail, store: StoreInfo, opts: { reprint?: boolean } = {}): ReceiptLine[] {
  const out: ReceiptLine[] = [];
  const center = (t: string, extra: Partial<ReceiptLine> = {}) =>
    wrap(ascii(t), WIDTH).forEach((x) => out.push({ text: x, align: "center", ...extra }));

  center(store.store_name, { bold: true, big: true });
  if (store.store_address) center(store.store_address);
  out.push(sep());
  if (opts.reprint) center("** CETAK ULANG **", { bold: true });
  if (order.status === "void") center("** DIBATALKAN **", { bold: true });
  out.push(L(`No   : ${order.code}`));
  out.push(L(`Tgl  : ${fmtDateTime(order.paidAt ?? order.createdAt)}`));
  if (order.tableLabel) out.push(L(`Meja : ${order.tableLabel}`));
  if (order.customerName) out.push(L(`Nama : ${order.customerName}`));
  out.push(L(`Kasir: ${order.payment?.receivedByName ?? order.createdByName}`));
  out.push(sep());

  for (const it of order.items) {
    const name = it.variantName === "Standar" ? it.productName : `${it.productName} ${it.variantName}`;
    leftRight(ascii(`${it.qty}x ${name}`), rupiah(it.unitPrice * it.qty)).forEach((t) => out.push({ text: t }));
    for (const o of it.options) {
      if (o.price > 0) {
        const label = /jumbo/i.test(it.variantName) ? `+ ${o.optionName} (Jumbo)` : `+ ${o.optionName}`;
        leftRight(ascii(label), rupiah(o.price * it.qty), 3).forEach((t) => out.push({ text: t }));
      } else {
        // "Rasa Indomie" -> "Rasa", "Merek Kopi" -> "Merek", "Suhu" -> "Suhu"
        const label = o.groupName.split(" ")[0];
        wrap(ascii(`${label}: ${o.optionName}`), WIDTH - 3).forEach((t) =>
          out.push({ text: "   " + t }),
        );
      }
    }
    if (it.note) wrap(ascii(`Catatan: ${it.note}`), WIDTH - 3).forEach((t) => out.push({ text: "   " + t }));
  }
  out.push(sep());
  leftRight("TOTAL", rupiah(order.total)).forEach((t) => out.push({ text: t, bold: true }));
  if (order.payment) {
    if (order.payment.method === "cash") {
      leftRight("Bayar (TUNAI)", rupiah(order.payment.amountReceived)).forEach((t) => out.push({ text: t }));
      leftRight("Kembali", rupiah(order.payment.changeAmount)).forEach((t) => out.push({ text: t }));
    } else {
      leftRight("Bayar (QRIS)", rupiah(order.payment.amountDue)).forEach((t) => out.push({ text: t }));
    }
  } else {
    center("BELUM DIBAYAR", { bold: true });
  }
  out.push(sep());
  if (store.receipt_footer) center(store.receipt_footer);
  if (store.store_hours) center(store.store_hours);
  return out;
}

export function buildTestReceipt(store: StoreInfo): ReceiptLine[] {
  const out: ReceiptLine[] = [];
  out.push({ text: ascii(store.store_name), align: "center", bold: true, big: true });
  out.push({ text: "TES PRINTER", align: "center", bold: true });
  out.push(sep());
  out.push({ text: "12345678901234567890123456789012" });
  out.push(...leftRight("Item contoh", rupiah(12000)).map((text) => ({ text })));
  out.push(sep());
  out.push({ text: "Printer siap dipakai :)", align: "center" });
  return out;
}

/** Konversi baris struk ke byte ESC/POS. */
export function toEscPos(lines: ReceiptLine[]): Uint8Array {
  const bytes: number[] = [];
  const push = (...b: number[]) => bytes.push(...b);
  const text = (s: string) => {
    for (const ch of ascii(s)) push(ch.charCodeAt(0));
  };
  push(0x1b, 0x40); // ESC @  inisialisasi
  for (const l of lines) {
    push(0x1b, 0x61, l.align === "center" ? 1 : 0); // ESC a  rata
    push(0x1b, 0x45, l.bold ? 1 : 0); // ESC E  tebal
    push(0x1d, 0x21, l.big ? 0x01 : 0x00); // GS !  tinggi ganda
    text(l.text);
    push(0x0a);
  }
  push(0x1b, 0x45, 0, 0x1d, 0x21, 0, 0x1b, 0x61, 0);
  push(0x1b, 0x64, 4); // ESC d 4  feed 4 baris supaya struk bisa disobek
  push(0x1d, 0x56, 0x42, 0x00); // GS V  potong (diabaikan printer tanpa cutter)
  return new Uint8Array(bytes);
}

export function receiptText(lines: ReceiptLine[]) {
  return lines
    .map((l) => (l.align === "center" ? " ".repeat(Math.max(0, Math.floor((WIDTH - l.text.length) / 2))) + l.text : l.text))
    .join("\n");
}
