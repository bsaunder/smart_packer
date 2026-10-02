import { NextRequest } from "next/server";
import { getApiUser, unauthorized } from "@/lib/apiAuth";
import { listTasks } from "@/services/taskService";

export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const tasks = await listTasks(user.id);
  return Response.json({ tasks });
}
