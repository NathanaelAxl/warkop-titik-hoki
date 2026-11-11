import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { readJson, requireUser, route } from "@/lib/api";
import { productInput, productSnapshot, reorderInput, saveProduct } from "@/lib/admin-menu";
import { loadMenu, loadOptionGroupsWithOptions } from "@/lib/menu";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Seluruh menu termasuk yang nonaktif + daftar grup pilihan (untuk halaman Kelola Menu)
export const GET = route(async () => {
  await requireUser("owner");
  const [categories, optionGroups] = await Promise.all([loadMenu(false), loadOptionGroupsWithOptions()]);
  return { categories, optionGroups };
});

export const POST = route(async (req) => {
  const user = await requireUser("owner");
  const input = productInput.parse(await readJson(req));
  const id = await db.transaction(async (tx) => {
    const id = await saveProduct(tx, null, input);
    await audit(user.id, "product.create", { id, after: await productSnapshot(tx, id) }, tx);
    return id;
  });
  return { id };
});

// Atur ulang urutan menu: { ids: [...] }
export const PUT = route(async (req) => {
  const user = await requireUser("owner");
  const { ids } = reorderInput.parse(await readJson(req));
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries())
      await tx.update(schema.products).set({ sortOrder: i + 1 }).where(eq(schema.products.id, id));
  });
  await audit(user.id, "product.reorder", { ids });
  return { ok: true };
});
