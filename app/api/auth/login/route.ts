import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { HttpError, readJson, route } from "@/lib/api";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";
import { audit } from "@/lib/audit";

const body = z.object({
  userId: z.number().int().positive(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN 4–6 digit"),
});

const MAX_FAIL = 5;
const LOCK_MINUTES = 5;

export const POST = route(async (req) => {
  const { userId, pin } = body.parse(await readJson(req));
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u || !u.isActive) throw new HttpError(401, "Pengguna tidak ditemukan");

  if (u.lockedUntil && u.lockedUntil > new Date()) {
    const min = Math.ceil((u.lockedUntil.getTime() - Date.now()) / 60000);
    throw new HttpError(429, `Terlalu banyak percobaan. Coba lagi dalam ${min} menit`);
  }

  const ok = await bcrypt.compare(pin, u.pinHash);
  if (!ok) {
    const fails = u.failedAttempts + 1;
    const lock = fails >= MAX_FAIL;
    await db
      .update(schema.users)
      .set({ failedAttempts: lock ? 0 : fails, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null })
      .where(eq(schema.users.id, u.id));
    throw new HttpError(401, lock ? `PIN salah ${MAX_FAIL}x. Akun dikunci ${LOCK_MINUTES} menit` : "PIN salah");
  }

  await db.update(schema.users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(schema.users.id, u.id));
  const token = await signSession({ uid: u.id, role: u.role, name: u.name });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  await audit(u.id, "auth.login");
  return { user: { id: u.id, name: u.name, role: u.role } };
});
