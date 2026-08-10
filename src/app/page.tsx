import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";
import { listTrips } from "@/services/tripService";

export default async function Dashboard() {
  const user = await getCurrentUser();
  const trips = await listTrips(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Signed in as {user.username}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/trips">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>Trips</CardTitle>
              <CardDescription>
                {trips.length} trip{trips.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/items">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>Master Items</CardTitle>
              <CardDescription>Manage the reusable item catalog</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/modules">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>Modules</CardTitle>
              <CardDescription>Reusable trip-type packing bundles</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/categories">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Organize items for display</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
