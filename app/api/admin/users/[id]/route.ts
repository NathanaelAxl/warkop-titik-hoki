import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { HttpError, idParam, readJson, requireUser, route } from "@/lib/api";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

const input = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  role: z.enum(["owner", "pegawai"]).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const owner = await requireUser("owner");
  const id = idParam((await params).id);
  const data = input.parse(await readJson(req));

  if (id === owner.id && (data.isActive === false || data.role === "pegawai"))
    throw new HttpError(400, "Tidak bisa menonaktifkan atau menurunkan akun sendiri");

  // Pastikan selalu ada minimal satu owner aktif
  if (data.isActive === false || data.role === "pegawai") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(and(eq(schema.users.role, "owner"), eq(schema.users.isActive, true), ne(schema.users.id, id)));
    const [target] = await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, id));
    if (target?.role === "owner" && n === 0) throw new HttpError(400, "Harus ada minimal satu owner aktif");
  }

  const r = await db.update(schema.users).set(data).where(eq(schema.users.id, id)).returning({ id: schema.users.id });
  if (!r.length) throw new HttpError(404, "Pengguna tidak ditemukan");
  await audit(owner.id, "user.update", { id, ...data });
  return { ok: true };
});
