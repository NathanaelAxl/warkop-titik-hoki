"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { OrderScreen } from "@/components/order-screen";

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  // ID dikunci saat halaman dibuka: setelah pesanan baru disimpan, URL diganti
  // ke /order/<id> tanpa me-reset layar (misalnya saat sedang proses bayar).
  const [orderId] = useState(() => {
    const n = Number(id);
    return id !== "new" && Number.isInteger(n) && n > 0 ? n : null;
  });
  return <OrderScreen orderId={orderId} />;
}
