import { requireUser, route } from "@/lib/api";
import { buildExport, exportCsv, exportFileName } from "@/lib/report-export";

export const dynamic = "force-dynamic";

// ?type=transactions|daily|top&from=YYYY-MM-DD&to=YYYY-MM-DD[&method=cash|qris]
export const GET = route(async (req) => {
  await requireUser("owner");
  const data = await buildExport(req.url);
  return new Response(exportCsv(data), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(data, "csv")}"`,
    },
  });
});
