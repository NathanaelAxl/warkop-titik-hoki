// Tipe data yang dipakai bersama oleh client dan server
export type Role = "owner" | "pegawai";

export type MenuOption = { id: number; name: string; price: number; priceJumbo: number | null };
export type MenuOptionGroup = {
  id: number; name: string; isRequired: boolean; minSelect: number; maxSelect: number | null;
  options: MenuOption[];
};
export type MenuVariant = { id: number; name: string; price: number };
export type MenuProduct = {
  id: number; categoryId: number; name: string; isActive: boolean; sortOrder: number;
  variants: MenuVariant[]; optionGroups: MenuOptionGroup[];
};
export type MenuCategory = { id: number; name: string; isActive: boolean; sortOrder: number; products: MenuProduct[] };

export type OrderStatus = "open" | "paid" | "void";
export type PayMethod = "cash" | "qris";

export type OrderItemOption = { groupName: string; optionName: string; price: number; optionId: number | null };
export type OrderItem = {
  id: number; productId: number | null; productName: string; variantName: string;
  unitPrice: number; qty: number; note: string | null; lineTotal: number; options: OrderItemOption[];
};
export type OrderDetail = {
  id: number; code: string; tableLabel: string | null; customerName: string | null;
  status: OrderStatus; subtotal: number; total: number; createdAt: string; paidAt: string | null;
  businessDate: string; createdByName: string; items: OrderItem[];
  payment: null | {
    method: PayMethod; amountDue: number; amountReceived: number; changeAmount: number;
    receivedByName: string; createdAt: string;
  };
  void: null | { reason: string; voidedByName: string; createdAt: string; wasPaid: boolean };
};
export type OrderSummary = {
  id: number; code: string; tableLabel: string | null; customerName: string | null;
  status: OrderStatus; total: number; itemCount: number; createdAt: string; paidAt: string | null;
  method: PayMethod | null; businessDate: string;
};
export type StoreInfo = {
  store_name: string; store_address: string; store_hours: string; receipt_footer: string; day_cutoff: string;
};

/** Harga topping mengikuti ukuran: varian "Jumbo" memakai price_jumbo kalau ada. */
export function optionPriceFor(variantName: string, opt: { price: number; priceJumbo: number | null }) {
  return /jumbo/i.test(variantName) && opt.priceJumbo != null ? opt.priceJumbo : opt.price;
}

export function orderLabel(o: { tableLabel: string | null; customerName: string | null }) {
  const parts = [];
  if (o.tableLabel) parts.push(`Meja ${o.tableLabel}`);
  if (o.customerName) parts.push(o.customerName);
  return parts.join(" · ") || "Tanpa nama";
}
