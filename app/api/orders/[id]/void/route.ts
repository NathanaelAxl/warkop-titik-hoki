import { idParam, readJson, requireUser, route } from "@/lib/api";
import { getOrderDetail, voidInput, voidOrder } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

// Pesanan terbuka: semua pengguna. Pesanan dibayar: hanya owner + alasan (dicek di voidOrder).
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const id = idParam((await params).id);
  const { reason } = voidInput.parse(await readJson(req));
  await voidOrder(user, id, reason);
  return { order: await getOrderDetail(id) };
});
