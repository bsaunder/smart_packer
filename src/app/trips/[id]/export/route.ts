import { NextRequest } from "next/server";
import { stringify } from "csv-stringify/sync";
import { getCurrentUser } from "@/lib/session";
import { getTrip, serializeTripDetail } from "@/services/tripService";

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "trip";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  const trip = await getTrip(user.id, id);
  if (!trip) return new Response("Not found", { status: 404 });

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const filename = slugify(trip.name);
  const payload = serializeTripDetail(trip);
  const items = payload.items;

  if (format === "csv") {
    const csv = stringify(
      items.map((i) => ({
        name: i.name,
        category: i.category,
        quantity: String(i.quantity),
        packed: i.packed ? "true" : "false",
        bag: i.bag ?? "",
        notes: i.notes ?? "",
      })),
      { header: true, columns: ["name", "category", "quantity", "packed", "bag", "notes"] }
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.json"`,
    },
  });
}
