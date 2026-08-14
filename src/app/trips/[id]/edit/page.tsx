import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTrip } from "@/services/tripService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateTripAction } from "./actions";

function toDateInputValue(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const trip = await getTrip(user.id, id);
  if (!trip) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit: {trip.name}</h1>

      <form action={updateTripAction} className="flex flex-col gap-4 rounded-lg border p-4">
        <input type="hidden" name="tripId" value={trip.id} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Trip name</Label>
            <Input id="name" name="name" defaultValue={trip.name} required className="w-64" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input id="destination" name="destination" defaultValue={trip.destination ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={toDateInputValue(trip.startDate)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" name="endDate" type="date" defaultValue={toDateInputValue(trip.endDate)} />
          </div>
        </div>
        <Button type="submit" className="w-fit">
          Save changes
        </Button>
      </form>
    </div>
  );
}
