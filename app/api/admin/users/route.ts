import bcrypt from "bcryptjs";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { readJson, requireUser, route } from "@/lib/api";
import { audit } from "@/lib/audit";
import { pinSchema } from "@/lib/admin-menu";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireUser("owner");
  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      role: schema.users.role,
      isActive: schema.users.isActive,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.role), asc(schema.users.name));
  return { users };
});

const createInput = z.object({
  name: z.string().trim().min(1).max(40),
  role: z.enum(["owner", "pegawai"]).default("pegawai"),
  pin: pinSchema,
});

export const POST = route(async (req) => {
  const owner = await requireUser("owner");
  const input = createInput.parse(await readJson(req));
  const [row] = await db
    .insert(schema.users)
    .values({ name: input.name, role: input.role, pinHash: await bcrypt.hash(input.pin, 10) })
    .returning({ id: schema.users.id });
  await audit(owner.id, "user.create", { id: row.id, name: input.name, role: input.role });
  return { id: row.id };
});
