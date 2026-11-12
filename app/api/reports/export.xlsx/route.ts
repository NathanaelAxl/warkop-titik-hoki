import { requireUser, route } from "@/lib/api";
import { buildExport, exportFileName, exportXlsx } from "@/lib/report-export";

export const dynamic = "force-dynamic";

// ?type=transactions|daily|top&from=YYYY-MM-DD&to=YYYY-MM-DD[&method=cash|qris]
export const GET = route(async (req) => {
  await requireUser("owner");
  const data = await buildExport(req.url);
  const buf = await exportXlsx(data);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFileName(data, "xlsx")}"`,
    },
  });
});
