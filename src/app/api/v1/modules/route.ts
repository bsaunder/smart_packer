import { NextRequest } from "next/server";
import { getApiUser, unauthorized } from "@/lib/apiAuth";
import { listModules } from "@/services/moduleService";

export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const modules = await listModules(user.id);
  return Response.json({ modules });
}
