import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { listTrips } from "@/services/tripService";

// Per-user data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";
import { listModules } from "@/services/moduleService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDateRange } from "@/lib/formatDate";
import { createTripAction } from "./actions";

export default async function TripsPage() {
  const user = await getCurrentUser();
  const [trips, modules] = await Promise.all([
    listTrips(user.id),
    listModules(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Trips</h1>

      <form action={createTripAction} className="flex flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Trip name</Label>
            <Input id="name" name="name" placeholder="e.g. Vancouver + Alaska Cruise" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input id="destination" name="destination" placeholder="optional" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" name="startDate" type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" name="endDate" type="date" />
          </div>
        </div>

        {modules.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>Generate from modules (optional)</Label>
            <div className="flex flex-wrap gap-4">
              {modules.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <Checkbox name="moduleIds" value={m.id} />
                  {m.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" className="w-fit">
          Create trip
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        {trips.map((t) => {
          const dateRange = formatDateRange(t.startDate, t.endDate);
          return (
            <Link key={t.id} href={`/trips/${t.id}`}>
              <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle>{t.name}</CardTitle>
                  {(t.destination || dateRange) && (
                    <CardDescription>
                      {[t.destination, dateRange].filter(Boolean).join(" — ")}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          );
        })}
        {trips.length === 0 && (
          <p className="text-muted-foreground">No trips yet.</p>
        )}
      </div>

      <Link href="/trips/history" className="text-sm text-muted-foreground hover:text-foreground">
        View Trip History →
      </Link>
    </div>
  );
}
