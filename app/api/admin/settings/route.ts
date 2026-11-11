import { z } from "zod";
import { db, schema } from "@/lib/db";
import { readJson, requireUser, route } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const text = z.string().trim().max(80);
const input = z.object({
  store_name: text.min(1, "wajib diisi"),
  store_address: text,
  store_hours: text,
  receipt_footer: text,
  day_cutoff: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "format HH:MM"),
});

export const GET = route(async () => {
  await requireUser("owner");
  return { settings: await getSettings() };
});

export const PUT = route(async (req) => {
  const user = await requireUser("owner");
  const data = input.parse(await readJson(req));
  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(data)) {
      await tx
        .insert(schema.settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: schema.settings.key, set: { value } });
    }
  });
  await audit(user.id, "settings.update", data);
  return { settings: await getSettings() };
});
