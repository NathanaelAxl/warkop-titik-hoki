"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Printer, TriangleAlert } from "lucide-react";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { useApp } from "./app-context";
import { buildReceipt, receiptText } from "@/lib/receipt";
import { printReceipt } from "@/lib/printer";
import { errMsg } from "@/lib/client";
import type { OrderDetail } from "@/lib/types";

export function ReceiptPreview({ order, reprint }: { order: OrderDetail; reprint?: boolean }) {
  const { store } = useApp();
  return (
    <pre className="mx-auto w-fit overflow-x-auto rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 font-mono text-[12px] leading-[1.35] text-stone-800">
      {receiptText(buildReceipt(order, store, { reprint }))}
    </pre>
  );
}

/**
 * Dialog setelah bayar: cetak otomatis, tampilkan status, tombol Cetak Ulang kalau gagal.
 */
export function PaidDialog({ order, onDone }: { order: OrderDetail; onDone: () => void }) {
  const { store } = useApp();
  const [state, setState] = useState<"printing" | "ok" | "failed">("printing");
  const [error, setError] = useState("");
  const printedOnce = useRef(false);

  const doPrint = useCallback(async () => {
    setState("printing");
    try {
      await printReceipt(order, store, printedOnce.current);
      printedOnce.current = true;
      setState("ok");
    } catch (e) {
      setError(errMsg(e));
      setState("failed");
    }
  }, [order, store]);

  useEffect(() => {
    doPrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = order.payment?.method === "cash" ? order.payment.changeAmount : null;

  return (
    <Dialog open onClose={onDone} title="Pembayaran Berhasil" dismissable={false} className="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={doPrint} loading={state === "printing"}>
            <Printer className="h-5 w-5" /> {printedOnce.current ? "Cetak Ulang" : "Cetak Struk"}
          </Button>
          <Button size="lg" onClick={onDone}>Selesai</Button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
        <CheckCircle2 className="h-8 w-8 shrink-0" />
        <div>
          <div className="font-bold">{order.code} lunas ({order.payment?.method === "qris" ? "QRIS" : "Tunai"})</div>
          {change != null && (
            <div className="text-2xl font-extrabold">Kembalian: Rp {change.toLocaleString("id-ID")}</div>
          )}
        </div>
      </div>
      {state === "printing" && <p className="mb-3 text-sm text-stone-600">Mencetak struk…</p>}
      {state === "ok" && <p className="mb-3 text-sm font-medium text-emerald-700">Struk terkirim ke printer.</p>}
      {state === "failed" && (
        <div className="mb-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <TriangleAlert className="h-5 w-5 shrink-0" />
          <div>
            <b>Struk gagal dicetak.</b> Transaksi tetap tersimpan. {error}
            <br />Tekan “Cetak Struk” untuk mencoba lagi, atau cetak ulang nanti dari menu Riwayat.
          </div>
        </div>
      )}
      <ReceiptPreview order={order} />
    </Dialog>
  );
}
