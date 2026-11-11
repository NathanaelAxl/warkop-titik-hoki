import { db } from "@/lib/db";
import { readJson, requireUser, route } from "@/lib/api";
import { optionGroupInput, saveOptionGroup } from "@/lib/admin-menu";
import { loadOptionGroupsWithOptions } from "@/lib/menu";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireUser("owner");
  return { optionGroups: await loadOptionGroupsWithOptions() };
});

export const POST = route(async (req) => {
  const user = await requireUser("owner");
  const input = optionGroupInput.parse(await readJson(req));
  const id = await db.transaction((tx) => saveOptionGroup(tx, null, input));
  await audit(user.id, "option_group.create", { id, ...input });
  return { id };
});
