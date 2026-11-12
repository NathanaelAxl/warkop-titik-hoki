"use client";
import { useState } from "react";
import { Banknote, QrCode } from "lucide-react";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api, errMsg } from "@/lib/client";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderDetail, PayMethod } from "@/lib/types";

export function PayDialog({
  order,
  onClose,
  onPaid,
}: {
  order: OrderDetail;
  onClose: () => void;
  onPaid: (o: OrderDetail) => void;
}) {
  const [method, setMethod] = useState<PayMethod>("cash");
  const [received, setReceived] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = order.total;
  const change = received != null ? received - total : null;
  const canPay = method === "qris" || (received != null && received >= total);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ order: OrderDetail }>(`/api/orders/${order.id}/pay`, {
        body: { method, amountReceived: method === "cash" ? received : undefined },
      });
      onPaid(r.order);
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  }

  const quick = [
    { label: "Uang Pas", value: total },
    { label: "20rb", value: 20000 },
    { label: "50rb", value: 50000 },
    { label: "100rb", value: 100000 },
  ];

  return (
    <Dialog
      open
      onClose={busy ? () => {} : onClose}
      title={`Bayar ${order.code}`}
      className="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button size="lg" variant="success" disabled={!canPay} loading={busy} onClick={confirm}>
            {method === "qris" ? "Konfirmasi QRIS Masuk" : "Konfirmasi Bayar"}
          </Button>
        </>
      }
    >
      <div className="bg-espresso-gradient mb-4 rounded-2xl p-4 text-center text-white">
        <div className="text-sm text-stone-400">Total tagihan</div>
        <div className="text-4xl font-extrabold">Rp {rupiah(total)}</div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        {(
          [
            ["cash", "Tunai", Banknote],
            ["qris", "QRIS", QrCode],
          ] as const
        ).map(([m, label, Icon]) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={cn(
              "flex h-16 items-center justify-center gap-2 rounded-2xl border-2 text-lg font-bold transition",
              method === m ? "border-brand-500 bg-brand-50 text-brand-800" : "border-stone-200 text-stone-600",
            )}
          >
            <Icon className="h-6 w-6" /> {label}
          </button>
        ))}
      </div>

      {method === "cash" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Uang diterima</label>
          <Input
            inputMode="numeric"
            autoFocus
            className="h-14 text-2xl font-bold"
            placeholder="0"
            value={received == null ? "" : rupiah(received)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              setReceived(digits ? Math.min(Number(digits), 100_000_000) : null);
            }}
          />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {quick.map((q) => (
              <Button
                key={q.label}
                variant={received === q.value ? "default" : "secondary"}
                size="lg"
                className="px-2 text-base"
                disabled={q.value < total}
                onClick={() => setReceived(q.value)}
              >
                {q.label}
              </Button>
            ))}
          </div>
          <div
            className={cn(
              "mt-4 flex items-center justify-between rounded-2xl p-4",
              change != null && change < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800",
            )}
          >
            <span className="font-semibold">{change != null && change < 0 ? "Kurang" : "Kembalian"}</span>
            <span className="text-3xl font-extrabold">Rp {rupiah(Math.abs(change ?? 0))}</span>
          </div>
        </div>
      ) : (
        <ol className="list-decimal space-y-2 rounded-2xl bg-sky-50 p-4 pl-8 text-sky-900">
          <li>Minta pelanggan scan QRIS yang tercetak di meja kasir.</li>
          <li>
            Pastikan nominal yang dibayar <b>Rp {rupiah(total)}</b>.
          </li>
          <li>Cek notifikasi dana masuk di HP, lalu tekan <b>Konfirmasi QRIS Masuk</b>.</li>
        </ol>
      )}
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
    </Dialog>
  );
}
