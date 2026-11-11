import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { HttpError, idParam, readJson, requireUser, route } from "@/lib/api";
import { optionGroupInput, saveOptionGroup } from "@/lib/admin-menu";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser("owner");
  const id = idParam((await params).id);
  const input = optionGroupInput.parse(await readJson(req));
  const before = await db.select().from(schema.options).where(eq(schema.options.groupId, id));
  await db.transaction((tx) => saveOptionGroup(tx, id, input));
  await audit(user.id, "option_group.update", {
    id,
    before: before.map((o) => ({ name: o.name, price: o.price, priceJumbo: o.priceJumbo })),
    after: input,
  });
  return { ok: true };
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser("owner");
  const id = idParam((await params).id);
  const r = await db
    .delete(schema.optionGroups)
    .where(eq(schema.optionGroups.id, id))
    .returning({ name: schema.optionGroups.name });
  if (!r.length) throw new HttpError(404, "Grup pilihan tidak ditemukan");
  await audit(user.id, "option_group.delete", { id, name: r[0].name });
  return { ok: true };
});
