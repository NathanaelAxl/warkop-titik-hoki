"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { fmtBusinessDate, rupiah } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";
import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, EmptyState, PageHeader, Spinner } from "@/components/ui/misc";
import { TransactionTable } from "@/components/transaction-table";
import { TransactionDetail } from "@/components/transaction-detail";
import { cn } from "@/lib/utils";

type Daily = { date: string; omzet: number; trxCount: number; cash: number; qris: number; voidCount: number };
type Totals = Omit<Daily, "date">;
type Top = { name: string; qty: number; revenue: number };

function addDays(d: string, n: number) {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const { businessDate } = useApp();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<"rekap" | "top" | "trx">("rekap");
  const [method, setMethod] = useState("");
  const [daily, setDaily] = useState<{ days: Daily[]; total: Totals } | null>(null);
  const [top, setTop] = useState<Top[] | null>(null);
  const [trx, setTrx] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (businessDate && !from) {
      setFrom(businessDate);
      setTo(businessDate);
    }
  }, [businessDate, from]);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setError("");
    setDaily(null);
    setTop(null);
    setTrx(null);
    const qs = `from=${from}&to=${to}`;
    try {
      const [d, t, x] = await Promise.all([
        api<{ days: Daily[]; total: Totals }>(`/api/reports/daily?${qs}`),
        api<{ items: Top[] }>(`/api/reports/top-items?${qs}`),
        api<{ orders: OrderSummary[] }>(`/api/transactions?${qs}${method ? `&method=${method}` : ""}`),
      ]);
      setDaily(d);
      setTop(t.items);
      setTrx(x.orders);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [from, to, method]);

  useEffect(() => {
    load();
  }, [load]);

  const presets = businessDate
    ? [
        { label: "Hari ini", f: businessDate, t: businessDate },
        { label: "Kemarin", f: addDays(businessDate, -1), t: addDays(businessDate, -1) },
        { label: "7 hari", f: addDays(businessDate, -6), t: businessDate },
        { label: "Bulan ini", f: businessDate.slice(0, 8) + "01", t: businessDate },
      ]
    : [];

  const exportUrl = (ext: "csv" | "xlsx") => {
    const type = tab === "rekap" ? "daily" : tab === "top" ? "top" : "transactions";
    return `/api/reports/export.${ext}?type=${type}&from=${from}&to=${to}${type === "transactions" && method ? `&method=${method}` : ""}`;
  };

  const t = daily?.total;
  const maxQty = Math.max(1, ...(top ?? []).map((i) => i.qty));

  return (
    <div className="p-3 md:p-4">
      <PageHeader title="Laporan">
        {presets.map((p) => (
          <Button
            key={p.label}
            size="sm"
            variant={from === p.f && to === p.t ? "default" : "outline"}
            onClick={() => {
              setFrom(p.f);
              setTo(p.t);
            }}
          >
            {p.label}
          </Button>
        ))}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-w-0 flex-1 sm:w-40 sm:flex-none" />
          <span>–</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-w-0 flex-1 sm:w-40 sm:flex-none" />
        </div>
      </PageHeader>
      <p className="-mt-2 mb-4 text-sm text-stone-500">
        Tanggal = hari bisnis (transaksi setelah tengah malam masuk ke hari sebelumnya).
      </p>

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Omzet" value={t ? `Rp ${rupiah(t.omzet)}` : "…"} strong />
        <Stat label="Jumlah transaksi" value={t ? String(t.trxCount) : "…"} />
        <Stat label="Total Tunai" value={t ? `Rp ${rupiah(t.cash)}` : "…"} />
        <Stat label="Total QRIS" value={t ? `Rp ${rupiah(t.qris)}` : "…"} />
        <Stat label="Transaksi dibatalkan" value={t ? String(t.voidCount) : "…"} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["rekap", "Rekap Harian"],
            ["top", "Menu Terlaris"],
            ["trx", "Daftar Transaksi"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn("h-11 shrink-0 rounded-xl px-3 text-sm font-semibold sm:px-4", tab === k ? "bg-stone-900 text-white" : "bg-white text-stone-700")}
          >
            {l}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {tab === "trx" && (
            <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-40">
              <option value="">Semua metode</option>
              <option value="cash">Tunai</option>
              <option value="qris">QRIS</option>
            </Select>
          )}
          <a href={exportUrl("xlsx")} title="Unduh tabel Excel (.xlsx)">
            <Button variant="outline">
              <FileSpreadsheet className="h-5 w-5 text-emerald-700" /> Excel
            </Button>
          </a>
          <a href={exportUrl("csv")} title="Unduh file CSV">
            <Button variant="outline">
              <Download className="h-5 w-5" /> CSV
            </Button>
          </a>
        </div>
      </div>

      <Card>
        {tab === "rekap" &&
          (!daily ? (
            <Loading />
          ) : daily.days.length === 0 ? (
            <EmptyState title="Belum ada transaksi di rentang ini" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Hari bisnis</th>
                    <th className="px-3 py-2 text-right">Omzet</th>
                    <th className="px-3 py-2 text-right">Transaksi</th>
                    <th className="px-3 py-2 text-right">Tunai</th>
                    <th className="px-3 py-2 text-right">QRIS</th>
                    <th className="px-3 py-2 text-right">Dibatalkan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {daily.days.map((d) => (
                    <tr key={d.date} className="h-12">
                      <td className="px-3">{fmtBusinessDate(d.date)}</td>
                      <td className="px-3 text-right font-semibold">{rupiah(d.omzet)}</td>
                      <td className="px-3 text-right">{d.trxCount}</td>
                      <td className="px-3 text-right">{rupiah(d.cash)}</td>
                      <td className="px-3 text-right">{rupiah(d.qris)}</td>
                      <td className="px-3 text-right">{d.voidCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {tab === "top" &&
          (!top ? (
            <Loading />
          ) : top.length === 0 ? (
            <EmptyState title="Belum ada penjualan di rentang ini" />
          ) : (
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
                <tr>
                  <th className="w-10 px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Menu</th>
                  <th className="px-3 py-2 text-right">Terjual</th>
                  <th className="px-3 py-2 text-right">Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {top.map((i, idx) => (
                  <tr key={i.name} className="h-12">
                    <td className="px-3 text-stone-400">{idx + 1}</td>
                    <td className="whitespace-normal px-3">
                      <div className="font-medium">{i.name}</div>
                      <div className="mt-1 h-1.5 rounded-full bg-brand-500" style={{ width: `${(i.qty / maxQty) * 100}%` }} />
                    </td>
                    <td className="px-3 text-right font-semibold">{i.qty}</td>
                    <td className="px-3 text-right">{rupiah(i.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {tab === "trx" &&
          (!trx ? <Loading /> : trx.length === 0 ? <EmptyState title="Tidak ada transaksi" /> : <TransactionTable orders={trx} onOpen={setOpenId} />)}
      </Card>
      {openId && <TransactionDetail orderId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Spinner />
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Card className={cn("p-3 sm:p-4", strong && "border-brand-300 bg-brand-50")}>
      <div className="text-xs text-stone-500 sm:text-sm">{label}</div>
      <div className={cn("font-bold", strong ? "text-xl text-brand-800 sm:text-2xl" : "text-lg sm:text-xl")}>{value}</div>
    </Card>
  );
}
