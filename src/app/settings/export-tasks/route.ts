import { getCurrentUser } from "@/lib/session";
import { exportTasksCsv } from "@/services/taskCsvService";

export async function GET() {
  const user = await getCurrentUser();
  const csv = await exportTasksCsv(user.id);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="smart-packing-planner-tasks.csv"',
    },
  });
}
