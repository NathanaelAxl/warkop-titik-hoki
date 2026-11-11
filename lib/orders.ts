import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema, type Tx } from "./db";
import { HttpError, type CurrentUser } from "./api";
import { audit } from "./audit";
import { businessDateOf } from "./format";
import { getSettings } from "./settings";
import { optionPriceFor, type OrderDetail, type OrderSummary, type PayMethod } from "./types";

// ---------- Validasi input ----------

const qty = z.number().int().min(1, "jumlah minimal 1").max(99, "jumlah maksimal 99");
const note = z.string().trim().max(120).optional().nullable();

const existingItem = z.object({ id: z.number().int().positive(), qty, note });
const newItem = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  optionIds: z.array(z.number().int().positive()).max(30).default([]),
  qty,
  note,
});
export const itemInput = z.union([existingItem, newItem]);

const label = z.string().trim().max(40).optional().nullable();

export const orderInput = z
  .object({
    tableLabel: label,
    customerName: label,
    items: z.array(itemInput).max(200),
  })
  .refine((v) => !!(v.tableLabel || v.customerName), {
    message: "Isi nomor meja atau nama pelanggan",
    path: ["tableLabel"],
  });
export type OrderInput = z.infer<typeof orderInput>;

// ---------- Snapshot item ----------

type ItemDraft = {
  existingId?: number;
  productId: number | null;
  productName: string;
  variantName: string;
  unitPrice: number;
  qty: number;
  note: string | null;
  options: { optionId: number | null; groupName: string; optionName: string; price: number }[];
};

function itemKey(d: ItemDraft) {
  const opts = d.options.map((o) => `${o.optionId ?? o.optionName}:${o.price}`).sort().join(",");
  return [d.productId ?? d.productName, d.variantName, d.unitPrice, opts, (d.note ?? "").toLowerCase()].join("|");
}

function lineTotal(d: Pick<ItemDraft, "unitPrice" | "qty" | "options">) {
  return (d.unitPrice + d.options.reduce((s, o) => s + o.price, 0)) * d.qty;
}

/** Bangun snapshot item baru dari harga di database (harga dari tablet tidak dipercaya). */
async function buildNewItems(tx: Tx, inputs: z.infer<typeof newItem>[]): Promise<ItemDraft[]> {
  if (inputs.length === 0) return [];
  const productIds = [...new Set(inputs.map((i) => i.productId))];
  const [prods, vars, links] = await Promise.all([
    tx
      .select({ id: schema.products.id, name: schema.products.name, isActive: schema.products.isActive, catActive: schema.categories.isActive })
      .from(schema.products)
      .innerJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId))
      .where(inArray(schema.products.id, productIds)),
    tx.select().from(schema.productVariants).where(inArray(schema.productVariants.productId, productIds)),
    tx.select().from(schema.productOptionGroups).where(inArray(schema.productOptionGroups.productId, productIds)),
  ]);
  const groupIds = [...new Set(links.map((l) => l.optionGroupId))];
  const [groups, opts] = groupIds.length
    ? await Promise.all([
        tx.select().from(schema.optionGroups).where(inArray(schema.optionGroups.id, groupIds)),
        tx.select().from(schema.options).where(inArray(schema.options.groupId, groupIds)),
      ])
    : [[], []];

  return inputs.map((inp) => {
    const p = prods.find((x) => x.id === inp.productId);
    if (!p || !p.isActive || !p.catActive) throw new HttpError(400, "Ada menu yang sudah tidak tersedia, muat ulang menu");
    const v = vars.find((x) => x.id === inp.variantId && x.productId === p.id);
    if (!v) throw new HttpError(400, `Varian ${p.name} tidak valid`);

    const productGroups = links
      .filter((l) => l.productId === p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => groups.find((g) => g.id === l.optionGroupId)!)
      .filter(Boolean);
    const chosen = [...new Set(inp.optionIds)].map((oid) => {
      const o = opts.find((x) => x.id === oid);
      if (!o || !productGroups.some((g) => g.id === o.groupId)) throw new HttpError(400, `Pilihan untuk ${p.name} tidak valid`);
      return o;
    });
    const options: ItemDraft["options"] = [];
    for (const g of productGroups) {
      const sel = chosen.filter((o) => o.groupId === g.id);
      const min = Math.max(g.minSelect, g.isRequired ? 1 : 0);
      if (sel.length < min) throw new HttpError(400, `${p.name}: pilih ${g.name}`);
      if (g.maxSelect != null && sel.length > g.maxSelect)
        throw new HttpError(400, `${p.name}: ${g.name} maksimal ${g.maxSelect} pilihan`);
      for (const o of sel)
        options.push({ optionId: o.id, groupName: g.name, optionName: o.name, price: optionPriceFor(v.name, o) });
    }
    return {
      productId: p.id,
      productName: p.name,
      variantName: v.name,
      unitPrice: v.price,
      qty: inp.qty,
      note: inp.note || null,
      options,
    };
  });
}

/** Terapkan daftar item (lengkap) ke pesanan: ubah, hapus, tambah, gabung yang sama. */
async function applyItems(tx: Tx, orderId: number, items: z.infer<typeof itemInput>[]) {
  const existingRows = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  const existingOpts = existingRows.length
    ? await tx.select().from(schema.orderItemOptions).where(inArray(schema.orderItemOptions.orderItemId, existingRows.map((r) => r.id)))
    : [];

  const drafts: ItemDraft[] = [];
  const newInputs: z.infer<typeof newItem>[] = [];
  for (const it of items) {
    if ("productId" in it) {
      newInputs.push(it);
      continue;
    }
    const row = existingRows.find((r) => r.id === it.id);
    if (!row) throw new HttpError(400, "Item pesanan tidak ditemukan, muat ulang pesanan");
    drafts.push({
      existingId: row.id,
      productId: row.productId,
      productName: row.productName,
      variantName: row.variantName,
      unitPrice: row.unitPrice,
      qty: it.qty,
      note: it.note || null,
      options: existingOpts
        .filter((o) => o.orderItemId === row.id)
        .map((o) => ({ optionId: o.optionId, groupName: o.groupName, optionName: o.optionName, price: o.price })),
    });
  }
  drafts.push(...(await buildNewItems(tx, newInputs)));

  // Gabungkan item yang sama persis (menu, varian, pilihan, catatan, harga)
  const merged = new Map<string, ItemDraft>();
  for (const d of drafts) {
    const k = itemKey(d);
    const m = merged.get(k);
    if (!m) merged.set(k, { ...d });
    else {
      m.qty += d.qty;
      if (!m.existingId && d.existingId) m.existingId = d.existingId;
    }
  }
  const finalItems = [...merged.values()];
  if (finalItems.some((d) => d.qty > 99)) throw new HttpError(400, "Jumlah per item maksimal 99");

  const keepIds = new Set(finalItems.map((d) => d.existingId).filter(Boolean) as number[]);
  const toDelete = existingRows.filter((r) => !keepIds.has(r.id)).map((r) => r.id);
  if (toDelete.length) await tx.delete(schema.orderItems).where(inArray(schema.orderItems.id, toDelete));

  let sort = 0;
  for (const d of finalItems) {
    sort++;
    if (d.existingId) {
      await tx
        .update(schema.orderItems)
        .set({ qty: d.qty, note: d.note, lineTotal: lineTotal(d), sortOrder: sort })
        .where(eq(schema.orderItems.id, d.existingId));
    } else {
      const [row] = await tx
        .insert(schema.orderItems)
        .values({
          orderId,
          productId: d.productId,
          productName: d.productName,
          variantName: d.variantName,
          unitPrice: d.unitPrice,
          qty: d.qty,
          note: d.note,
          lineTotal: lineTotal(d),
          sortOrder: sort,
        })
        .returning({ id: schema.orderItems.id });
      if (d.options.length)
        await tx.insert(schema.orderItemOptions).values(d.options.map((o) => ({ ...o, orderItemId: row.id })));
    }
  }
  await recomputeTotals(tx, orderId);
}

async function recomputeTotals(tx: Tx, orderId: number) {
  const [{ sum }] = await tx
    .select({ sum: sql<string>`coalesce(sum(${schema.orderItems.lineTotal}), 0)` })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));
  const subtotal = Number(sum);
  await tx
    .update(schema.orders)
    .set({ subtotal, total: subtotal, updatedAt: new Date() })
    .where(eq(schema.orders.id, orderId));
  return subtotal;
}

// ---------- Operasi pesanan ----------

export async function createOrder(user: CurrentUser, input: OrderInput) {
  const settings = await getSettings();
  const businessDate = businessDateOf(new Date(), settings.day_cutoff);
  const prefix = `TH-${businessDate.replaceAll("-", "")}-`;

  return db.transaction(async (tx) => {
    // Kunci agar nomor struk berurutan dan tidak bentrok
    await tx.execute(sql`select pg_advisory_xact_lock(7001)`);
    const [last] = await tx
      .select({ code: schema.orders.code })
      .from(schema.orders)
      .where(sql`${schema.orders.code} like ${prefix + "%"}`)
      .orderBy(desc(schema.orders.code))
      .limit(1);
    const next = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
    const code = prefix + String(next).padStart(4, "0");

    const [order] = await tx
      .insert(schema.orders)
      .values({
        code,
        tableLabel: input.tableLabel || null,
        customerName: input.customerName || null,
        createdBy: user.id,
        businessDate,
      })
      .returning({ id: schema.orders.id });
    await applyItems(tx, order.id, input.items);
    return order.id;
  });
}

async function lockOrder(tx: Tx, id: number) {
  const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, id)).for("update");
  if (!o) throw new HttpError(404, "Pesanan tidak ditemukan");
  return o;
}

export async function updateOrder(user: CurrentUser, id: number, input: OrderInput) {
  await db.transaction(async (tx) => {
    const o = await lockOrder(tx, id);
    if (o.status !== "open") throw new HttpError(409, "Pesanan sudah dibayar/dibatalkan dan tidak bisa diubah");
    await tx
      .update(schema.orders)
      .set({ tableLabel: input.tableLabel || null, customerName: input.customerName || null })
      .where(eq(schema.orders.id, id));
    await applyItems(tx, id, input.items);
  });
}

export const payInput = z.object({
  method: z.enum(["cash", "qris"]),
  amountReceived: z.number().int().min(0).max(100_000_000).optional(),
});

export async function payOrder(user: CurrentUser, id: number, input: z.infer<typeof payInput>) {
  await db.transaction(async (tx) => {
    const o = await lockOrder(tx, id);
    if (o.status !== "open") throw new HttpError(409, "Pesanan sudah dibayar atau dibatalkan");
    const total = await recomputeTotals(tx, id);
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id));
    if (n === 0 || total <= 0) throw new HttpError(400, "Pesanan masih kosong");

    let received = total;
    if (input.method === "cash") {
      if (input.amountReceived == null) throw new HttpError(400, "Isi uang diterima");
      if (input.amountReceived < total) throw new HttpError(400, "Uang diterima kurang dari total");
      received = input.amountReceived;
    }
    const change = received - total;
    await tx.insert(schema.payments).values({
      orderId: id,
      method: input.method,
      amountDue: total,
      amountReceived: received,
      changeAmount: change,
      receivedBy: user.id,
    });
    await tx.update(schema.orders).set({ status: "paid", paidAt: new Date(), updatedAt: new Date() }).where(eq(schema.orders.id, id));
    await audit(user.id, "order.pay", { orderId: id, code: o.code, method: input.method, total, received, change }, tx);
  });
}

export const voidInput = z.object({ reason: z.string().trim().max(200).optional().default("") });

export async function voidOrder(user: CurrentUser, id: number, reasonRaw: string) {
  await db.transaction(async (tx) => {
    const o = await lockOrder(tx, id);
    if (o.status === "void") throw new HttpError(409, "Pesanan sudah dibatalkan");
    const wasPaid = o.status === "paid";
    // Pesanan yang sudah dibayar hanya bisa dibatalkan owner, dengan alasan
    if (wasPaid && user.role !== "owner") throw new HttpError(403, "Hanya owner yang boleh membatalkan transaksi yang sudah dibayar");
    if (wasPaid && reasonRaw.length < 3) throw new HttpError(400, "Alasan pembatalan wajib diisi");
    const reason = reasonRaw || "Dibatalkan sebelum dibayar";
    await tx.insert(schema.voids).values({ orderId: id, reason, wasPaid, voidedBy: user.id });
    await tx.update(schema.orders).set({ status: "void", updatedAt: new Date() }).where(eq(schema.orders.id, id));
    await audit(user.id, "order.void", { orderId: id, code: o.code, wasPaid, total: o.total, reason }, tx);
  });
}

// ---------- Baca data ----------

async function userNames(ids: number[]) {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return new Map<number, string>();
  const rows = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, uniq));
  return new Map(rows.map((r) => [r.id, r.name]));
}

export async function getOrderDetail(id: number): Promise<OrderDetail> {
  const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!o) throw new HttpError(404, "Pesanan tidak ditemukan");
  const [items, [pay], [vd]] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id)).orderBy(asc(schema.orderItems.sortOrder), asc(schema.orderItems.id)),
    db.select().from(schema.payments).where(eq(schema.payments.orderId, id)),
    db.select().from(schema.voids).where(eq(schema.voids.orderId, id)),
  ]);
  const opts = items.length
    ? await db.select().from(schema.orderItemOptions).where(inArray(schema.orderItemOptions.orderItemId, items.map((i) => i.id))).orderBy(asc(schema.orderItemOptions.id))
    : [];
  const names = await userNames([o.createdBy, pay?.receivedBy, vd?.voidedBy].filter(Boolean) as number[]);
  return {
    id: o.id,
    code: o.code,
    tableLabel: o.tableLabel,
    customerName: o.customerName,
    status: o.status,
    subtotal: o.subtotal,
    total: o.total,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    businessDate: o.businessDate,
    createdByName: names.get(o.createdBy) ?? "-",
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      variantName: i.variantName,
      unitPrice: i.unitPrice,
      qty: i.qty,
      note: i.note,
      lineTotal: i.lineTotal,
      options: opts
        .filter((x) => x.orderItemId === i.id)
        .map((x) => ({ groupName: x.groupName, optionName: x.optionName, price: x.price, optionId: x.optionId })),
    })),
    payment: pay
      ? {
          method: pay.method,
          amountDue: pay.amountDue,
          amountReceived: pay.amountReceived,
          changeAmount: pay.changeAmount,
          receivedByName: names.get(pay.receivedBy) ?? "-",
          createdAt: pay.createdAt.toISOString(),
        }
      : null,
    void: vd
      ? { reason: vd.reason, voidedByName: names.get(vd.voidedBy) ?? "-", createdAt: vd.createdAt.toISOString(), wasPaid: vd.wasPaid }
      : null,
  };
}

export async function listOrders(f: {
  status?: ("open" | "paid" | "void")[];
  from?: string;
  to?: string;
  method?: PayMethod;
  limit?: number;
}): Promise<OrderSummary[]> {
  const conds: SQL[] = [];
  if (f.status?.length) conds.push(inArray(schema.orders.status, f.status));
  if (f.from) conds.push(gte(schema.orders.businessDate, f.from));
  if (f.to) conds.push(lte(schema.orders.businessDate, f.to));
  if (f.method) conds.push(eq(schema.payments.method, f.method));
  const rows = await db
    .select({
      id: schema.orders.id,
      code: schema.orders.code,
      tableLabel: schema.orders.tableLabel,
      customerName: schema.orders.customerName,
      status: schema.orders.status,
      total: schema.orders.total,
      createdAt: schema.orders.createdAt,
      paidAt: schema.orders.paidAt,
      businessDate: schema.orders.businessDate,
      method: schema.payments.method,
      itemCount: sql<number>`(select coalesce(sum(qty),0)::int from order_items oi where oi.order_id = ${schema.orders.id})`,
    })
    .from(schema.orders)
    .leftJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.orders.createdAt))
    .limit(f.limit ?? 500);
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    paidAt: r.paidAt?.toISOString() ?? null,
    method: r.method ?? null,
  }));
}
