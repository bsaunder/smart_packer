import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { listTripsForHistory } from "@/services/tripService";
import { formatDateRange } from "@/lib/formatDate";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Per-user data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function TripHistoryPage() {
  const user = await getCurrentUser();
  const trips = await listTripsForHistory(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Trip History</h1>
        <p className="text-muted-foreground">
          Every trip, most recently dated first. Duplicate a past trip to start a new one from what you actually packed.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {trips.map((t) => {
          const dateRange = formatDateRange(t.startDate, t.endDate);
          return (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{t.name}</CardTitle>
                  {(t.destination || dateRange) && (
                    <CardDescription>
                      {[t.destination, dateRange].filter(Boolean).join(" — ")}
                    </CardDescription>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.packedCount} / {t.itemCount} packed
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/trips/${t.id}`}>View</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/trips/${t.id}/duplicate`}>Duplicate</Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          );
        })}
        {trips.length === 0 && <p className="text-muted-foreground">No trips yet.</p>}
      </div>
    </div>
  );
}
