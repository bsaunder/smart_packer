import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";

// Per-user data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";
import { getDashboardTripBuckets } from "@/services/tripService";
import { countItems } from "@/services/itemService";
import { countModules } from "@/services/moduleService";
import { countCategories } from "@/services/categoryService";
import { formatDateRange } from "@/lib/formatDate";
import { getBuildInfo, REPO_URL } from "@/lib/version";

export default async function Dashboard() {
  const user = await getCurrentUser();
  const [{ upcoming, previous }, itemCount, moduleCount, categoryCount] = await Promise.all([
    getDashboardTripBuckets(user.id),
    countItems(user.id),
    countModules(user.id),
    countCategories(user.id),
  ]);

  const stats = [
    { label: "Trips", value: upcoming.length + previous.length },
    { label: "Upcoming", value: upcoming.length },
    { label: "Items", value: itemCount },
    { label: "Modules", value: moduleCount },
    { label: "Categories", value: categoryCount },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Signed in as {user.username}</p>
        </div>
        <Button asChild>
          <Link href="/trips">Create New Trip</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="gap-0 pb-0">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="font-heading text-3xl text-primary">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Upcoming Trips</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">
            No upcoming trips.{" "}
            <Link href="/trips" className="underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((t) => {
              const dateRange = formatDateRange(t.startDate, t.endDate);
              return (
                <Link key={t.id} href={`/trips/${t.id}`}>
                  <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        {(t.destination || dateRange) && (
                          <p className="text-sm text-muted-foreground">
                            {[t.destination, dateRange].filter(Boolean).join(" — ")}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-sm text-muted-foreground">
                        {t.packedCount} / {t.itemCount} packed
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold tracking-tight">Previous Trips</h2>
          <Link href="/trips/history" className="text-sm text-muted-foreground hover:text-foreground">
            View all →
          </Link>
        </div>
        {previous.length === 0 ? (
          <p className="text-muted-foreground">No previous trips yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {previous.slice(0, 3).map((t) => {
              const dateRange = formatDateRange(t.startDate, t.endDate);
              return (
                <Link key={t.id} href={`/trips/${t.id}`}>
                  <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        {(t.destination || dateRange) && (
                          <p className="text-sm text-muted-foreground">
                            {[t.destination, dateRange].filter(Boolean).join(" — ")}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-sm text-muted-foreground">
                        {t.packedCount} / {t.itemCount} packed
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/items">
          <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
              <CardTitle>Master Items</CardTitle>
              <CardDescription>Manage the reusable item catalog</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/modules">
          <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
              <CardTitle>Modules</CardTitle>
              <CardDescription>Reusable trip-type packing bundles</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/categories">
          <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Organize items for display</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <VersionFooter />
    </div>
  );
}

function VersionFooter() {
  const { version, commit, shortCommit, builtAt } = getBuildInfo();
  const linkClass = "underline-offset-4 hover:text-foreground hover:underline";
  return (
    <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
      Smart Packing Planner v{version}
      {" · "}
      {commit ? (
        <>
          build{" "}
          <a href={`${REPO_URL}/commit/${commit}`} className={`font-mono ${linkClass}`}>
            {shortCommit}
          </a>
          {builtAt && ` (${builtAt.toLocaleDateString("en-US", { dateStyle: "medium" })})`}
          {" · "}
          <a href={`${REPO_URL}/commits/main`} className={linkClass}>
            Check for updates
          </a>
        </>
      ) : (
        "local build"
      )}
    </footer>
  );
}
