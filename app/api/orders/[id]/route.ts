import { idParam, readJson, requireUser, route } from "@/lib/api";
import { getOrderDetail, orderInput, updateOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await requireUser();
  return { order: await getOrderDetail(idParam((await params).id)) };
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const id = idParam((await params).id);
  await updateOrder(user, id, orderInput.parse(await readJson(req)));
  return { order: await getOrderDetail(id) };
});
