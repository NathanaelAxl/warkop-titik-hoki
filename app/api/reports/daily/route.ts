import { requireUser, route } from "@/lib/api";
import { dailyReport, parseRange } from "@/lib/reports";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser("owner");
  const { from, to } = parseRange(req.url);
  const days = await dailyReport(from, to);
  const total = days.reduce(
    (a, d) => ({
      omzet: a.omzet + d.omzet,
      trxCount: a.trxCount + d.trxCount,
      cash: a.cash + d.cash,
      qris: a.qris + d.qris,
      voidCount: a.voidCount + d.voidCount,
    }),
    { omzet: 0, trxCount: 0, cash: 0, qris: 0, voidCount: 0 },
  );
  return { from, to, days, total };
});
