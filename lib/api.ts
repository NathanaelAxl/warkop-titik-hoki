import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { db, schema } from "./db";
import { SESSION_COOKIE, verifySession, type Role } from "./session";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type CurrentUser = { id: number; name: string; role: Role };

/** Cek sesi + ambil ulang user dari DB (supaya user nonaktif / ganti role langsung berlaku). */
export async function requireUser(role?: Role): Promise<CurrentUser> {
  const jar = await cookies();
  const sess = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!sess) throw new HttpError(401, "Sesi berakhir, silakan login lagi");
  const [u] = await db
    .select({ id: schema.users.id, name: schema.users.name, role: schema.users.role, isActive: schema.users.isActive })
    .from(schema.users)
    .where(eq(schema.users.id, sess.uid));
  if (!u || !u.isActive) throw new HttpError(401, "Akun tidak aktif");
  if (role && u.role !== role) throw new HttpError(403, "Hanya owner yang boleh melakukan ini");
  return { id: u.id, name: u.name, role: u.role };
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response | unknown>;

/** Bungkus route handler: ubah error jadi JSON {error} dengan status yang tepat. */
export function route<C = unknown>(fn: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      const res = await fn(req, ctx);
      if (res instanceof Response) return res;
      return NextResponse.json(res ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        const msg = e.issues.map((i) => `${i.path.join(".") || "data"}: ${i.message}`).join("; ");
        return NextResponse.json({ error: `Data tidak valid — ${msg}` }, { status: 400 });
      }
      console.error(e);
      return NextResponse.json({ error: "Terjadi kesalahan di server" }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Body JSON tidak valid");
  }
}

export function idParam(v: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, "Data tidak ditemukan");
  return n;
}
