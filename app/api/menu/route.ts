import { requireUser, route } from "@/lib/api";
import { loadMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireUser();
  return { categories: await loadMenu(true) };
});
