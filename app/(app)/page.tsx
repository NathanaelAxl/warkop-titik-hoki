"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Clock, Plus, RefreshCw } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { fmtTime, rupiah } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Spinner } from "@/components/ui/misc";

function minutesAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  return `${Math.floor(m / 60)} jam ${m % 60} mnt lalu`;
}

export default function OpenOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ orders: OrderSummary[] }>("/api/orders?status=open");
      setOrders(r.orders);
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
    return () => clearInterval(t);
  }, [load]);

  const total = orders?.reduce((a, o) => a + o.total, 0) ?? 0;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pesanan Terbuka</h1>
          <p className="text-sm text-stone-500">
            {orders ? `${orders.length} pesanan belum dibayar · Rp ${rupiah(total)}` : "Memuat…"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} aria-label="Muat ulang">
            <RefreshCw className={loading ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
          </Button>
          <Link href="/order/new">
            <Button size="lg">
              <Plus className="h-6 w-6" /> Pesanan Baru
            </Button>
          </Link>
        </div>
      </div>

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

      {!orders ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title="Belum ada pesanan terbuka">
          <p>Tekan “Pesanan Baru” saat ada pelanggan memesan.</p>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {orders.map((o) => (
            <Link key={o.id} href={`/order/${o.id}`}>
              <Card className="flex h-full flex-col gap-2 p-4 transition hover:border-brand-400 hover:shadow-md active:scale-[0.99]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {o.tableLabel && <div className="text-2xl font-extrabold text-brand-700">Meja {o.tableLabel}</div>}
                    {o.customerName && (
                      <div className={o.tableLabel ? "truncate font-semibold text-stone-700" : "truncate text-2xl font-extrabold text-brand-700"}>
                        {o.customerName}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 rounded-lg bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
                    {o.itemCount} item
                  </span>
                </div>
                <div className="mt-auto flex items-end justify-between">
                  <div className="flex items-center gap-1 text-xs text-stone-500">
                    <Clock className="h-3.5 w-3.5" /> {fmtTime(o.createdAt)} · {minutesAgo(o.createdAt)}
                  </div>
                  <div className="text-lg font-bold">Rp {rupiah(o.total)}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
