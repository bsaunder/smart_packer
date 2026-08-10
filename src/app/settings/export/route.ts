import { getCurrentUser } from "@/lib/session";
import { exportItemsCsv } from "@/services/exportService";

export async function GET() {
  const user = await getCurrentUser();
  const csv = await exportItemsCsv(user.id);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="smart-packing-planner-items.csv"',
    },
  });
}
