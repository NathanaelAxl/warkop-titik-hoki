import { requireUser, route } from "@/lib/api";
import { dailyReport, parseRange, toCsv, topItems } from "@/lib/reports";
import { listOrders } from "@/lib/orders";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { paid: "Dibayar", void: "Dibatalkan", open: "Terbuka" };

// ?type=transactions|daily|top&from=YYYY-MM-DD&to=YYYY-MM-DD[&method=cash|qris]
export const GET = route(async (req) => {
  await requireUser("owner");
  const { from, to, sp } = parseRange(req.url);
  const type = sp.get("type") ?? "transactions";
  let csv: string;

  if (type === "daily") {
    const days = await dailyReport(from, to);
    csv = toCsv(
      ["Tanggal Bisnis", "Omzet", "Jumlah Transaksi", "Tunai", "QRIS", "Transaksi Dibatalkan"],
      days.map((d) => [d.date, d.omzet, d.trxCount, d.cash, d.qris, d.voidCount]),
    );
  } else if (type === "top") {
    const items = await topItems(from, to, 500);
    csv = toCsv(["Menu", "Terjual", "Pendapatan"], items.map((i) => [i.name, i.qty, i.revenue]));
  } else {
    const m = sp.get("method");
    const orders = await listOrders({
      status: ["paid", "void"],
      from,
      to,
      method: m === "cash" || m === "qris" ? m : undefined,
      limit: 100000,
    });
    csv = toCsv(
      ["No Struk", "Tanggal Bisnis", "Waktu Bayar", "Meja", "Pelanggan", "Jumlah Item", "Total", "Metode", "Status"],
      orders.map((o) => [
        o.code,
        o.businessDate,
        o.paidAt ? fmtDateTime(o.paidAt) : "",
        o.tableLabel,
        o.customerName,
        o.itemCount,
        o.total,
        o.method === "cash" ? "Tunai" : o.method === "qris" ? "QRIS" : "",
        STATUS[o.status],
      ]),
    );
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${type}-${from}_${to}.csv"`,
    },
  });
});
