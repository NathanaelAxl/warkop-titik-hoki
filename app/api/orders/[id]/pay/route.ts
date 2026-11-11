import { idParam, readJson, requireUser, route } from "@/lib/api";
import { getOrderDetail, payInput, payOrder } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const id = idParam((await params).id);
  await payOrder(user, id, payInput.parse(await readJson(req)));
  return { order: await getOrderDetail(id) };
});
