import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { listTrips } from "@/services/tripService";
import { listModules } from "@/services/moduleService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createTripAction } from "./actions";

export default async function TripsPage() {
  const user = await getCurrentUser();
  const [trips, modules] = await Promise.all([
    listTrips(user.id),
    listModules(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Trips</h1>

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
        {trips.map((t) => (
          <Link key={t.id} href={`/trips/${t.id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle>{t.name}</CardTitle>
                {t.destination && <CardDescription>{t.destination}</CardDescription>}
              </CardHeader>
            </Card>
          </Link>
        ))}
        {trips.length === 0 && (
          <p className="text-muted-foreground">No trips yet.</p>
        )}
      </div>
    </div>
  );
}
