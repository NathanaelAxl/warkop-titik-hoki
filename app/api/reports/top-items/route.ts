import { requireUser, route } from "@/lib/api";
import { parseRange, topItems } from "@/lib/reports";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser("owner");
  const { from, to } = parseRange(req.url);
  return { from, to, items: await topItems(from, to) };
});
