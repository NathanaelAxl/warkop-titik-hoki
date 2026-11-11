import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { HttpError, idParam, readJson, requireUser, route } from "@/lib/api";
import { productInput, productSnapshot, saveProduct } from "@/lib/admin-menu";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser("owner");
  const id = idParam((await params).id);
  const raw = await readJson(req);

  // Ubah status aktif saja (tombol cepat, misalnya menu habis)
  const quick = z.object({ isActive: z.boolean() }).strict().safeParse(raw);
  if (quick.success) {
    const r = await db
      .update(schema.products)
      .set({ isActive: quick.data.isActive })
      .where(eq(schema.products.id, id))
      .returning({ id: schema.products.id });
    if (!r.length) throw new HttpError(404, "Menu tidak ditemukan");
    await audit(user.id, "product.toggle", { id, isActive: quick.data.isActive });
    return { ok: true };
  }

  const input = productInput.parse(raw);
  await db.transaction(async (tx) => {
    const before = await productSnapshot(tx, id);
    if (!before) throw new HttpError(404, "Menu tidak ditemukan");
    await saveProduct(tx, id, input);
    // Catat perubahan harga: siapa dan kapan
    await audit(user.id, "product.update", { id, before, after: await productSnapshot(tx, id) }, tx);
  });
  return { ok: true };
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser("owner");
  const id = idParam((await params).id);
  const before = await productSnapshot(db, id);
  if (!before) throw new HttpError(404, "Menu tidak ditemukan");
  // Aman dihapus: pesanan lama menyimpan snapshot nama & harga
  await db.delete(schema.products).where(eq(schema.products.id, id));
  await audit(user.id, "product.delete", { id, before });
  return { ok: true };
});
