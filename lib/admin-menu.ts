import "server-only";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema, type Tx } from "./db";
import { HttpError } from "./api";

const name = z.string().trim().min(1, "wajib diisi").max(60);
const price = z.number().int().min(0).max(10_000_000);

export const pinSchema = z.string().regex(/^\d{4,6}$/, "PIN harus 4-6 digit angka");

export const categoryInput = z.object({
  name: name.optional(),
  isActive: z.boolean().optional(),
});

export const reorderInput = z.object({ ids: z.array(z.number().int().positive()).max(500) });

export const productInput = z.object({
  categoryId: z.number().int().positive(),
  name,
  isActive: z.boolean().default(true),
  variants: z
    .array(z.object({ id: z.number().int().positive().optional(), name, price }))
    .min(1, "minimal satu varian")
    .max(10),
  optionGroupIds: z.array(z.number().int().positive()).max(20).default([]),
});

export const optionGroupInput = z
  .object({
    name,
    isRequired: z.boolean().default(false),
    minSelect: z.number().int().min(0).max(20).default(0),
    maxSelect: z.number().int().min(1).max(20).nullable().default(null),
    options: z
      .array(
        z.object({
          id: z.number().int().positive().optional(),
          name,
          price: price.default(0),
          priceJumbo: price.nullable().default(null),
        }),
      )
      .min(1, "minimal satu pilihan")
      .max(50),
  })
  .refine((g) => g.maxSelect == null || g.maxSelect >= Math.max(g.minSelect, g.isRequired ? 1 : 0), {
    message: "Maksimal pilih harus lebih besar atau sama dengan minimal pilih",
    path: ["maxSelect"],
  });

/** Simpan produk + varian + relasi grup pilihan (dipakai POST dan PATCH). */
export async function saveProduct(tx: Tx, productId: number | null, input: z.infer<typeof productInput>) {
  const [cat] = await tx.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.id, input.categoryId));
  if (!cat) throw new HttpError(400, "Kategori tidak ditemukan");

  let id = productId;
  if (id == null) {
    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${schema.products.sortOrder}), 0)::int` })
      .from(schema.products)
      .where(eq(schema.products.categoryId, input.categoryId));
    const [row] = await tx
      .insert(schema.products)
      .values({ categoryId: input.categoryId, name: input.name, isActive: input.isActive, sortOrder: max + 1 })
      .returning({ id: schema.products.id });
    id = row.id;
  } else {
    const r = await tx
      .update(schema.products)
      .set({ categoryId: input.categoryId, name: input.name, isActive: input.isActive })
      .where(eq(schema.products.id, id))
      .returning({ id: schema.products.id });
    if (!r.length) throw new HttpError(404, "Menu tidak ditemukan");
  }
  const pid = id;

  // Varian: update yang ada, hapus yang dibuang, tambah yang baru
  const keep = input.variants.map((v) => v.id).filter(Boolean) as number[];
  await tx
    .delete(schema.productVariants)
    .where(and(eq(schema.productVariants.productId, pid), keep.length ? notInArray(schema.productVariants.id, keep) : undefined));
  for (const [i, v] of input.variants.entries()) {
    if (v.id) {
      await tx
        .update(schema.productVariants)
        .set({ name: v.name, price: v.price, sortOrder: i })
        .where(and(eq(schema.productVariants.id, v.id), eq(schema.productVariants.productId, pid)));
    } else {
      await tx.insert(schema.productVariants).values({ productId: pid, name: v.name, price: v.price, sortOrder: i });
    }
  }

  // Grup pilihan
  await tx.delete(schema.productOptionGroups).where(eq(schema.productOptionGroups.productId, pid));
  const gids = [...new Set(input.optionGroupIds)];
  if (gids.length) {
    const found = await tx.select({ id: schema.optionGroups.id }).from(schema.optionGroups).where(inArray(schema.optionGroups.id, gids));
    if (found.length !== gids.length) throw new HttpError(400, "Grup pilihan tidak ditemukan");
    await tx.insert(schema.productOptionGroups).values(gids.map((g, i) => ({ productId: pid, optionGroupId: g, sortOrder: i })));
  }
  return pid;
}

export async function saveOptionGroup(tx: Tx, groupId: number | null, input: z.infer<typeof optionGroupInput>) {
  const vals = { name: input.name, isRequired: input.isRequired, minSelect: input.minSelect, maxSelect: input.maxSelect };
  let id = groupId;
  if (id == null) {
    const [row] = await tx.insert(schema.optionGroups).values(vals).returning({ id: schema.optionGroups.id });
    id = row.id;
  } else {
    const r = await tx.update(schema.optionGroups).set(vals).where(eq(schema.optionGroups.id, id)).returning({ id: schema.optionGroups.id });
    if (!r.length) throw new HttpError(404, "Grup pilihan tidak ditemukan");
  }
  const gid = id;
  const keep = input.options.map((o) => o.id).filter(Boolean) as number[];
  await tx.delete(schema.options).where(and(eq(schema.options.groupId, gid), keep.length ? notInArray(schema.options.id, keep) : undefined));
  for (const [i, o] of input.options.entries()) {
    const v = { name: o.name, price: o.price, priceJumbo: o.priceJumbo, sortOrder: i };
    if (o.id) await tx.update(schema.options).set(v).where(and(eq(schema.options.id, o.id), eq(schema.options.groupId, gid)));
    else await tx.insert(schema.options).values({ ...v, groupId: gid });
  }
  return gid;
}

export async function productSnapshot(tx: Tx | typeof db, id: number) {
  const [p] = await tx.select().from(schema.products).where(eq(schema.products.id, id));
  const vars = await tx
    .select({ name: schema.productVariants.name, price: schema.productVariants.price })
    .from(schema.productVariants)
    .where(eq(schema.productVariants.productId, id));
  return p ? { name: p.name, isActive: p.isActive, variants: vars } : null;
}
