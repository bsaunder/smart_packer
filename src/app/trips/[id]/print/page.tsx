import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTrip } from "@/services/tripService";
import {
  buildViewLink,
  groupTripItems,
  parseViewParams,
  visibleTripItems,
  type ViewParams,
} from "@/lib/packingListView";
import { PrintButton } from "./print-button";
import { formatDate } from "@/lib/formatDate";
import { dueDate, groupTasks, type Anchor } from "@/lib/taskTiming";

type PrintParams = ViewParams & { notes?: string; bags?: string; theme?: string; blank?: string; tasks?: string };

const THEME_CLASSES: Record<string, string> = {
  compact: "text-xs [&_.print-category]:mb-3",
  large: "text-lg [&_.print-category]:mb-6",
  standard: "text-sm",
};

export default async function TripPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<PrintParams>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const parsed = parseViewParams(raw);
  const includeNotes = raw.notes === "1";
  const includeBags = raw.bags === "1";
  const blank = raw.blank === "1";
  // Tasks print by default (Pre-Departure first, After Return last); tasks=0 omits them.
  const includeTasks = raw.tasks !== "0";
  const theme = raw.theme === "compact" || raw.theme === "large" ? raw.theme : "standard";

  const user = await getCurrentUser();
  const trip = await getTrip(user.id, id);
  if (!trip) notFound();

  const groups = groupTripItems(visibleTripItems(trip, parsed), parsed.view);
  const basePath = `/trips/${trip.id}/print`;

  function optionLink(overrides: Partial<PrintParams>) {
    const base = buildViewLink(basePath, parsed, overrides);
    const [path, existingQs] = base.split("?");
    const params = new URLSearchParams(existingQs);
    const notes = overrides.notes ?? raw.notes;
    const bags = overrides.bags ?? raw.bags;
    const th = overrides.theme ?? raw.theme;
    const bl = overrides.blank ?? raw.blank;
    const tk = overrides.tasks ?? raw.tasks;
    if (notes === "1") params.set("notes", "1");
    if (bags === "1") params.set("bags", "1");
    if (th && th !== "standard") params.set("theme", th);
    if (bl === "1") params.set("blank", "1");
    if (tk === "0") params.set("tasks", "0");
    const qs = params.toString();
    return `${path}${qs ? `?${qs}` : ""}`;
  }

  const printDate = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-wrap items-center gap-4 text-sm">
        <Link href={`/trips/${trip.id}`} className="text-muted-foreground">
          ← Back to Trip
        </Link>
        <div className="flex gap-2">
          <span className="text-muted-foreground">View:</span>
          <Link href={optionLink({ view: "category" })} className={parsed.view === "category" ? "font-medium" : "text-muted-foreground"}>
            By Category
          </Link>
          <Link href={optionLink({ view: "bag" })} className={parsed.view === "bag" ? "font-medium" : "text-muted-foreground"}>
            By Bag
          </Link>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground">Theme:</span>
          {(["standard", "compact", "large"] as const).map((t) => (
            <Link key={t} href={optionLink({ theme: t })} className={theme === t ? "font-medium" : "text-muted-foreground"}>
              {t[0].toUpperCase() + t.slice(1)}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href={optionLink({ notes: includeNotes ? "" : "1" })} className={includeNotes ? "font-medium" : "text-muted-foreground"}>
            Notes
          </Link>
          <Link href={optionLink({ bags: includeBags ? "" : "1" })} className={includeBags ? "font-medium" : "text-muted-foreground"}>
            Bag assignments
          </Link>
          <Link href={optionLink({ blank: blank ? "" : "1" })} className={blank ? "font-medium" : "text-muted-foreground"}>
            Blank checklist
          </Link>
          <Link href={optionLink({ tasks: includeTasks ? "0" : "" })} className={includeTasks ? "font-medium" : "text-muted-foreground"}>
            Tasks
          </Link>
        </div>
        <PrintButton />
      </div>

      <div className={THEME_CLASSES[theme]}>
        <div className="mb-4">
          <h1 className="text-xl font-semibold">{trip.name}</h1>
          {trip.destination && <p>{trip.destination}</p>}
          <p className="text-muted-foreground">Printed {printDate}</p>
        </div>

        {includeTasks && (
          <PrintTasks title="Pre-Departure" anchor="DEPARTURE" trip={trip} blank={blank} includeNotes={includeNotes} />
        )}

        <div className="print-checklist">
          {[...groups.entries()].map(([groupName, items]) => (
            <div key={groupName} className="print-category">
              <h2 className="mb-1 font-medium">{groupName}</h2>
              <ul className="flex flex-col gap-1">
                {items.map((item) => {
                  const quantity = item.quantityOverride ?? item.quantity;
                  const checked = !blank && item.packed;
                  return (
                    <li key={item.id} className="print-item">
                      <input type="checkbox" checked={checked} readOnly />
                      <span>
                        {item.name}
                        {quantity > 1 ? ` ×${quantity}` : ""}
                        {includeBags && item.bag ? ` — ${item.bag.name}` : ""}
                        {includeNotes && item.notes ? ` (${item.notes})` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {includeTasks && (
          <PrintTasks title="After Return" anchor="RETURN" trip={trip} blank={blank} includeNotes={includeNotes} />
        )}
      </div>
    </div>
  );
}

type PrintTrip = NonNullable<Awaited<ReturnType<typeof getTrip>>>;

/** One task checklist, printed as its own section in the same two-column layout as the packing list. */
function PrintTasks({
  title,
  anchor,
  trip,
  blank,
  includeNotes,
}: {
  title: string;
  anchor: Anchor;
  trip: PrintTrip;
  blank: boolean;
  includeNotes: boolean;
}) {
  const groups = groupTasks(trip.tripTasks.filter((t) => !t.removed), anchor);
  if (groups.length === 0) return null;

  const row = (t: PrintTrip["tripTasks"][number], parentName?: string) => (
    <div className="print-item">
      <input type="checkbox" checked={!blank && t.done} readOnly />
      <span>
        {t.name}
        {parentName ? ` · ${parentName}` : ""}
        {includeNotes && t.notes ? ` (${t.notes})` : ""}
      </span>
    </div>
  );

  return (
    <section className="mb-4">
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <div className="print-checklist">
        {groups.map((group) => {
          const due = dueDate(trip, anchor, group.days);
          return (
            <div key={group.days} className="print-category">
              <h3 className="mb-1 font-medium">
                {group.label}
                {due && <span className="font-normal text-muted-foreground"> · {formatDate(due)}</span>}
              </h3>
              <ul className="flex flex-col gap-1">
                {group.tasks.map(({ task, children, parentName }) => (
                  <li key={task.id} className="flex flex-col gap-1">
                    {row(task, parentName)}
                    {children.length > 0 && (
                      <ul className="ml-5 flex flex-col gap-1">
                        {children.map((child) => (
                          <li key={child.id}>{row(child)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
