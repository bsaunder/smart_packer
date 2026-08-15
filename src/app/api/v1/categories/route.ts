import { NextRequest } from "next/server";
import { getApiUser, unauthorized } from "@/lib/apiAuth";
import { listCategories } from "@/services/categoryService";

export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const categories = await listCategories(user.id);
  return Response.json({ categories });
}
