import { NextRequest } from "next/server";
import { getApiUser, unauthorized } from "@/lib/apiAuth";
import { listItems } from "@/services/itemService";

export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const items = await listItems(user.id);
  return Response.json({ items });
}
