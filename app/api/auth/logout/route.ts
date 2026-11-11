import { cookies } from "next/headers";
import { route } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";

export const POST = route(async () => {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return { ok: true };
});
