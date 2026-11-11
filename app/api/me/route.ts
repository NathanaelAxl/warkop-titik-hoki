import { requireUser, route } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { businessDateOf } from "@/lib/format";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const store = await getSettings();
  return { user, store, businessDate: businessDateOf(new Date(), store.day_cutoff) };
});
