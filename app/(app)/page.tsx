"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Clock, Inbox, Plus, RefreshCw, ShoppingBag } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { fmtTime, rupiah } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";
import { useApp } from "@/components/app-context";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

function minutes(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}
function minutesAgo(iso: string) {
  const m = minutes(iso);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt`;
  return `${Math.floor(m / 60)} jam ${m % 60} mnt`;
}
/** Warna penanda lama menunggu: hijau < 15 mnt, kuning < 30 mnt, merah ≥ 30 mnt */
function waitTone(iso: string) {
  const m = minutes(iso);
  if (m < 15) return { bar: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  if (m < 30) return { bar: "bg-amber-500", pill: "bg-amber-50 text-amber-700 ring-amber-200" };
  return { bar: "bg-red-500", pill: "bg-red-50 text-red-700 ring-red-200" };
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()));
  if (h >= 4 && h < 11) return "Selamat pagi";
  if (h >= 11 && h < 15) return "Selamat siang";
  if (h >= 15 && h < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function OpenOrdersPage() {
  const { user } = useApp();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [today, setToday] = useState<{ count: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [open, trx] = await Promise.all([
        api<{ orders: OrderSummary[] }>("/api/orders?status=open"),
        api<{ orders: OrderSummary[] }>("/api/transactions").catch(() => null),
      ]);
      setOrders(open.orders);
      if (trx) {
        const paid = trx.orders.filter((o) => o.status === "paid");
        setToday({ count: paid.length, total: paid.reduce((a, o) => a + o.total, 0) });
      }
      setError("");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    // perbarui label "x mnt" tiap 30 detik
    const t2 = setInterval(() => tick((x) => x + 1), 30000);
    return () => {
      clearInterval(t);
      clearInterval(t2);
    };
  }, [load]);

  const openTotal = orders?.reduce((a, o) => a + o.total, 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl p-3 md:p-4">
      {/* Sapaan + ringkasan hari ini */}
      <section className="relative mb-5 overflow-hidden rounded-2xl bg-espresso-900 p-5 text-white md:p-6">
        <p className="text-sm font-medium text-cream-200/70">{greeting()},</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{user.name}</h1>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-md">
          <div className="rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10">
            <div className="text-xs text-cream-200/80">Belum dibayar</div>
            <div className="text-lg font-bold">{orders ? `${orders.length} pesanan` : "…"}</div>
            <div className="text-xs text-cream-200/70">Rp {rupiah(openTotal)}</div>
          </div>
          <div className="rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10">
            <div className="text-xs text-cream-200/80">Terjual hari ini</div>
            <div className="text-lg font-bold">{today ? `Rp ${rupiah(today.total)}` : "…"}</div>
            <div className="text-xs text-cream-200/70">{today ? `${today.count} transaksi` : ""}</div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href="/order/new"
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-lg font-semibold transition hover:bg-brand-500 active:bg-brand-700 sm:flex-none sm:px-8"
          >
            <Plus className="h-6 w-6" /> Pesanan Baru
          </Link>
          <button
            onClick={load}
            aria-label="Muat ulang"
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10 transition hover:bg-white/10"
          >
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
          </button>
        </div>
      </section>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-espresso-900">Pesanan Terbuka</h2>
        <div className="hidden items-center gap-3 text-xs text-stone-500 sm:flex">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> &lt; 15 mnt</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> &lt; 30 mnt</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> lebih lama</span>
        </div>
      </div>

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

      {!orders ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title="Belum ada pesanan terbuka" icon={Inbox}>
          <p>Tekan “Pesanan Baru” saat ada pelanggan memesan.</p>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {orders.map((o, i) => {
            const tone = waitTone(o.createdAt);
            return (
              <Link
                key={o.id}
                href={`/order/${o.id}`}
                className="animate-fade-up group relative flex overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-[0_1px_2px_rgb(74_46_31/0.06),0_4px_14px_-6px_rgb(74_46_31/0.12)] transition hover:border-stone-300 hover:shadow-md"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <span className={cn("w-1.5 shrink-0", tone.bar)} />
                <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-cream-100 px-2 text-espresso-900">
                      {o.tableLabel ? (
                        <>
                          <span className="text-[9px] font-semibold uppercase leading-none tracking-wider text-stone-500">Meja</span>
                          <span className="text-xl font-bold leading-tight">{o.tableLabel}</span>
                        </>
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-stone-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-bold text-espresso-900">
                        {o.customerName || (o.tableLabel ? `Meja ${o.tableLabel}` : "Pelanggan")}
                      </div>
                      <div className="text-xs text-stone-500">
                        {o.itemCount} item · {o.code.slice(-4)}
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", tone.pill)}>
                      <Clock className="h-3.5 w-3.5" /> {fmtTime(o.createdAt)} · {minutesAgo(o.createdAt)}
                    </span>
                    <span className="text-lg font-bold text-espresso-900">Rp {rupiah(o.total)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
