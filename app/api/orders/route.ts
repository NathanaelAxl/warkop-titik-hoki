import { HttpError, readJson, requireUser, route } from "@/lib/api";
import { createOrder, listOrders, orderInput } from "@/lib/orders";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser();
  const status = new URL(req.url).searchParams.get("status") ?? "open";
  if (status !== "open") throw new HttpError(400, "Gunakan /api/transactions untuk riwayat");
  return { orders: await listOrders({ status: ["open"] }) };
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = orderInput.parse(await readJson(req));
  const id = await createOrder(user, input);
  return { id };
});
