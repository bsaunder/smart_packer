import { getUserForApiKey } from "@/services/apiKeyService";

/** Resolves the Bearer API key on a request to its owning user, or null if missing/invalid. */
export async function getApiUser(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  return getUserForApiKey(match[1].trim());
}

export function unauthorized() {
  return Response.json({ error: "Invalid or missing API key." }, { status: 401 });
}
