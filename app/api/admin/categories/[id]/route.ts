import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { HttpError, idParam, readJson, requireUser, route } from "@/lib/api";
import { categoryInput } from "@/lib/admin-menu";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser("owner");
  const id = idParam((await params).id);
  const input = categoryInput.parse(await readJson(req));
  const [row] = await db.update(schema.categories).set(input).where(eq(schema.categories.id, id)).returning();
  if (!row) throw new HttpError(404, "Kategori tidak ditemukan");
  await audit(user.id, "category.update", { id, ...input });
  return { category: row };
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser("owner");
  const id = idParam((await params).id);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.products)
    .where(eq(schema.products.categoryId, id));
  if (n > 0) throw new HttpError(409, "Kategori masih berisi menu. Hapus/pindahkan menunya dulu, atau nonaktifkan saja");
  await db.delete(schema.categories).where(eq(schema.categories.id, id));
  await audit(user.id, "category.delete", { id });
  return { ok: true };
});
