"use client";
import { fmtDateTime, rupiah } from "@/lib/format";
import { orderLabel, type OrderSummary } from "@/lib/types";
import { Badge } from "./ui/misc";

export function TransactionTable({ orders, onOpen }: { orders: OrderSummary[]; onOpen: (id: number) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-3 py-2">No Struk</th>
            <th className="px-3 py-2">Waktu</th>
            <th className="px-3 py-2">Meja / Nama</th>
            <th className="px-3 py-2 text-right">Item</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2">Metode</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {orders.map((o) => (
            <tr key={o.id} onClick={() => onOpen(o.id)} className="h-12 cursor-pointer hover:bg-brand-50">
              <td className="px-3 font-mono text-xs">{o.code}</td>
              <td className="px-3">{fmtDateTime(o.paidAt ?? o.createdAt)}</td>
              <td className="px-3">{orderLabel(o)}</td>
              <td className="px-3 text-right">{o.itemCount}</td>
              <td className={`px-3 text-right font-semibold ${o.status === "void" ? "text-stone-400 line-through" : ""}`}>
                {rupiah(o.total)}
              </td>
              <td className="px-3">{o.method === "cash" ? "Tunai" : o.method === "qris" ? "QRIS" : "-"}</td>
              <td className="px-3">
                <Badge color={o.status === "paid" ? "green" : o.status === "void" ? "red" : "brand"}>
                  {o.status === "paid" ? "Dibayar" : o.status === "void" ? "Batal" : "Terbuka"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
