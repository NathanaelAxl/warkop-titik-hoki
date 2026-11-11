"use client";
import { useEffect, useState } from "react";
import { Ban, Printer } from "lucide-react";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge, Spinner } from "./ui/misc";
import { useToast } from "./ui/toast";
import { useApp } from "./app-context";
import { ReceiptPreview } from "./receipt-dialog";
import { api, errMsg } from "@/lib/client";
import { printReceipt } from "@/lib/printer";
import { fmtDateTime } from "@/lib/format";
import type { OrderDetail } from "@/lib/types";

export function TransactionDetail({ orderId, onClose, onChanged }: { orderId: number; onClose: () => void; onChanged?: () => void }) {
  const { user, store } = useApp();
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ order: OrderDetail }>(`/api/orders/${orderId}`)
      .then((r) => setOrder(r.order))
      .catch((e) => setError(errMsg(e)));
  }, [orderId]);

  async function reprint() {
    if (!order) return;
    setPrinting(true);
    try {
      await printReceipt(order, store, true);
      toast("Struk dicetak ulang", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setPrinting(false);
    }
  }

  async function doVoid() {
    setBusy(true);
    try {
      const r = await api<{ order: OrderDetail }>(`/api/orders/${orderId}/void`, { body: { reason: reason.trim() } });
      setOrder(r.order);
      setVoiding(false);
      toast("Transaksi dibatalkan", "success");
      onChanged?.();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={order ? order.code : "Detail Transaksi"}
      className="max-w-xl"
      footer={
        order && (
          <>
            {user.role === "owner" && order.status === "paid" && (
              <Button variant="destructive" onClick={() => setVoiding(true)}>
                <Ban className="h-5 w-5" /> Batalkan
              </Button>
            )}
            {order.status === "paid" && (
              <Button variant="outline" onClick={reprint} loading={printing}>
                <Printer className="h-5 w-5" /> Cetak Ulang
              </Button>
            )}
            <Button onClick={onClose}>Tutup</Button>
          </>
        )
      }
    >
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : !order ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-sm">
            <Badge color={order.status === "paid" ? "green" : order.status === "void" ? "red" : "brand"}>
              {order.status === "paid" ? "Dibayar" : order.status === "void" ? "Dibatalkan" : "Terbuka"}
            </Badge>
            {order.payment && <Badge color="blue">{order.payment.method === "cash" ? "Tunai" : "QRIS"}</Badge>}
            <span className="text-stone-500">Dibuat {order.createdByName}, {fmtDateTime(order.createdAt)}</span>
          </div>
          {order.void && (
            <div className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              Dibatalkan oleh <b>{order.void.voidedByName}</b> pada {fmtDateTime(order.void.createdAt)}
              <br />
              Alasan: {order.void.reason}
            </div>
          )}
          {voiding && (
            <div className="mb-3 rounded-xl border-2 border-red-200 p-3">
              <p className="mb-2 text-sm font-semibold text-red-700">
                Batalkan transaksi yang sudah dibayar? Omzet hari ini akan berkurang. Alasan wajib diisi.
              </p>
              <Input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan pembatalan" />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setVoiding(false)}>
                  Tidak
                </Button>
                <Button variant="destructive" disabled={reason.trim().length < 3} loading={busy} onClick={doVoid}>
                  Ya, batalkan
                </Button>
              </div>
            </div>
          )}
          <ReceiptPreview order={order} />
        </>
      )}
    </Dialog>
  );
}
