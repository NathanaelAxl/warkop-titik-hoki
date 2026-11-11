import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { route } from "@/lib/api";

export const dynamic = "force-dynamic";

// Daftar nama pengguna aktif untuk layar login (tanpa data sensitif)
export const GET = route(async () => {
  const users = await db
    .select({ id: schema.users.id, name: schema.users.name, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.isActive, true))
    .orderBy(asc(schema.users.role), asc(schema.users.name));
  return { users };
});
