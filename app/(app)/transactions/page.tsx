"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { fmtBusinessDate, rupiah } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";
import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, EmptyState, PageHeader, Spinner } from "@/components/ui/misc";
import { TransactionTable } from "@/components/transaction-table";
import { TransactionDetail } from "@/components/transaction-detail";

export default function TransactionsPage() {
  const { user, businessDate } = useApp();
  const isOwner = user.role === "owner";
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("");
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const qs = new URLSearchParams();
      if (isOwner && date) qs.set("date", date);
      if (method) qs.set("method", method);
      const r = await api<{ orders: OrderSummary[]; today: string }>(`/api/transactions?${qs}`);
      setOrders(r.orders);
      if (!date) setDate(r.today);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [date, method, isOwner]);

  useEffect(() => {
    load();
  }, [load]);

  const paid = orders?.filter((o) => o.status === "paid") ?? [];
  const sum = (m?: string) => paid.filter((o) => !m || o.method === m).reduce((a, o) => a + o.total, 0);

  return (
    <div className="p-3 md:p-4">
      <PageHeader title="Riwayat Transaksi">
        {isOwner ? (
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        ) : (
          <span className="text-sm text-stone-500">Hari ini · {businessDate && fmtBusinessDate(businessDate)}</span>
        )}
        <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-40">
          <option value="">Semua metode</option>
          <option value="cash">Tunai</option>
          <option value="qris">QRIS</option>
        </Select>
        <Button variant="outline" size="icon" onClick={load} aria-label="Muat ulang">
          <RefreshCw className="h-5 w-5" />
        </Button>
      </PageHeader>

      {orders && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Transaksi dibayar" value={String(paid.length)} />
          <Stat label="Total" value={`Rp ${rupiah(sum())}`} />
          <Stat label="Tunai" value={`Rp ${rupiah(sum("cash"))}`} />
          <Stat label="QRIS" value={`Rp ${rupiah(sum("qris"))}`} />
        </div>
      )}

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Card>
        {!orders ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState title="Belum ada transaksi" />
        ) : (
          <TransactionTable orders={orders} onOpen={setOpenId} />
        )}
      </Card>
      {openId && <TransactionDetail orderId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </Card>
  );
}
