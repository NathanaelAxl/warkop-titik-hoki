// Token sesi (dipakai di middleware edge dan route handler)
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "th_session";
export const SESSION_MAX_AGE = 60 * 60 * 16; // 16 jam = satu shift lebih

export type Role = "owner" | "pegawai";
export type SessionPayload = { uid: number; role: Role; name: string };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET belum diisi (min. 16 karakter)");
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload) {
  return new SignJWT({ role: p.role, name: p.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(p.uid))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = Number(payload.sub);
    if (!uid) return null;
    return { uid, role: payload.role as Role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
