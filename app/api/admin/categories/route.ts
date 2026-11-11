import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { HttpError, readJson, requireUser, route } from "@/lib/api";
import { categoryInput, reorderInput } from "@/lib/admin-menu";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireUser("owner");
  return { categories: await db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder)) };
});

export const POST = route(async (req) => {
  const user = await requireUser("owner");
  const input = categoryInput.parse(await readJson(req));
  if (!input.name) throw new HttpError(400, "Nama kategori wajib diisi");
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${schema.categories.sortOrder}),0)::int` })
    .from(schema.categories);
  const [row] = await db
    .insert(schema.categories)
    .values({ name: input.name, isActive: input.isActive ?? true, sortOrder: max + 1 })
    .returning();
  await audit(user.id, "category.create", { id: row.id, name: row.name });
  return { category: row };
});

// Atur ulang urutan: { ids: [id kategori sesuai urutan baru] }
export const PUT = route(async (req) => {
  const user = await requireUser("owner");
  const { ids } = reorderInput.parse(await readJson(req));
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries())
      await tx.update(schema.categories).set({ sortOrder: i + 1 }).where(eq(schema.categories.id, id));
  });
  await audit(user.id, "category.reorder", { ids });
  return { ok: true };
});
