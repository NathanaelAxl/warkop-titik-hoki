import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { HttpError, idParam, readJson, requireUser, route } from "@/lib/api";
import { pinSchema } from "@/lib/admin-menu";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const owner = await requireUser("owner");
  const id = idParam((await params).id);
  const { pin } = z.object({ pin: pinSchema }).parse(await readJson(req));
  const r = await db
    .update(schema.users)
    .set({ pinHash: await bcrypt.hash(pin, 10), failedAttempts: 0, lockedUntil: null })
    .where(eq(schema.users.id, id))
    .returning({ id: schema.users.id });
  if (!r.length) throw new HttpError(404, "Pengguna tidak ditemukan");
  await audit(owner.id, "user.reset_pin", { id });
  return { ok: true };
});
