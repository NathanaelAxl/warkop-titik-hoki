"use client";
import { fmtDateTime, rupiah } from "@/lib/format";
import { orderLabel, type OrderSummary } from "@/lib/types";
import { Badge } from "./ui/misc";

export function TransactionTable({ orders, onOpen }: { orders: OrderSummary[]; onOpen: (id: number) => void }) {
  return (
    <>
    {/* HP: daftar kartu */}
    <ul className="divide-y divide-stone-100 md:hidden">
      {orders.map((o) => (
        <li key={o.id}>
          <button onClick={() => onOpen(o.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-brand-50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{orderLabel(o)}</span>
                <Badge color={o.status === "paid" ? "green" : o.status === "void" ? "red" : "brand"}>
                  {o.status === "paid" ? "Dibayar" : o.status === "void" ? "Batal" : "Terbuka"}
                </Badge>
              </div>
              <div className="mt-0.5 truncate text-xs text-stone-500">
                {o.code} · {fmtDateTime(o.paidAt ?? o.createdAt)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className={`font-bold ${o.status === "void" ? "text-stone-400 line-through" : ""}`}>{rupiah(o.total)}</div>
              <div className="text-xs text-stone-500">
                {o.itemCount} item · {o.method === "cash" ? "Tunai" : o.method === "qris" ? "QRIS" : "-"}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
    <div className="hidden overflow-x-auto md:block">
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
    </>
  );
}
