import { z } from "zod";
import { HttpError, requireUser, route } from "@/lib/api";
import { listOrders } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { businessDateOf } from "@/lib/format";

export const dynamic = "force-dynamic";
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const GET = route(async (req) => {
  const user = await requireUser();
  const sp = new URL(req.url).searchParams;
  const today = businessDateOf(new Date(), (await getSettings()).day_cutoff);

  let from = sp.get("from") ?? sp.get("date") ?? today;
  let to = sp.get("to") ?? sp.get("date") ?? from;
  dateStr.parse(from);
  dateStr.parse(to);
  // Pegawai hanya boleh melihat transaksi hari bisnis ini
  if (user.role !== "owner") {
    if (from !== today || to !== today) throw new HttpError(403, "Pegawai hanya bisa melihat transaksi hari ini");
    from = to = today;
  }
  const m = sp.get("method");
  const method = m === "cash" || m === "qris" ? m : undefined;
  const st = sp.get("status");
  const status = st === "paid" ? ["paid" as const] : st === "void" ? ["void" as const] : (["paid", "void"] as const);

  return { today, orders: await listOrders({ status: [...status], from, to, method, limit: 2000 }) };
});
