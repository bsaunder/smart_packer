import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTrip } from "@/services/tripService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { duplicateTripAction } from "./actions";

export default async function DuplicateTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const trip = await getTrip(user.id, id);
  if (!trip) notFound();

  const itemCount = trip.tripItems.filter((ti) => !ti.removed).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Duplicate: {trip.name}</h1>
        <p className="text-muted-foreground">
          Copies the {itemCount} current item{itemCount === 1 ? "" : "s"} (including custom additions,
          quantity overrides, and bag structure) into a new trip. Packed status resets — nothing
          starts pre-packed. Dates aren't copied since this is presumably for a different trip.
        </p>
      </div>

      <form action={duplicateTripAction} className="flex flex-col gap-4 rounded-lg border p-4">
        <input type="hidden" name="sourceTripId" value={trip.id} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">New trip name</Label>
            <Input id="name" name="name" defaultValue={`Copy of ${trip.name}`} required className="w-64" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input id="destination" name="destination" defaultValue={trip.destination ?? ""} />
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
        <Button type="submit" className="w-fit">
          Create duplicate
        </Button>
      </form>
    </div>
  );
}
