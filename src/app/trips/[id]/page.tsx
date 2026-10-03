import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTrip } from "@/services/tripService";
import { listModules } from "@/services/moduleService";
import { listCategories } from "@/services/categoryService";
import { listItems } from "@/services/itemService";
import { listBags } from "@/services/bagService";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteTripAction } from "../actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addCustomItemAction,
  addCustomTaskAction,
  addItemsToTripAction,
  addModulesToTripAction,
  addTasksToTripAction,
  createBagAction,
} from "./actions";
import {
  allCategoriesOf,
  buildViewLink,
  groupTripItems,
  parseViewParams,
  visibleTripItems,
  type ViewParams,
} from "@/lib/packingListView";
import { formatDateRange } from "@/lib/formatDate";
import { PackingList } from "./packing-list";
import { ScopeSelect } from "./scope-select";
import { AddExistingPicker, type PickerItem } from "./add-existing-picker";
import { TaskChecklist } from "./task-checklist";
import { listTasks } from "@/services/taskService";
import { timingLabel } from "@/lib/taskTiming";
import { ActionForm } from "@/components/action-form";
import { TimingFields } from "@/components/timing-fields";
import { cn } from "@/lib/utils";

function pillClass(active: boolean) {
  return cn(
    "rounded-full px-3 py-1 font-medium transition-colors",
    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
  );
}

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ViewParams>;
}) {
  const { id } = await params;
  const rawParams = await searchParams;
  const parsed = parseViewParams(rawParams);
  const { view, filter, scope } = parsed;

  const user = await getCurrentUser();
  const [trip, modules, categories, items, allBags, tasks] = await Promise.all([
    getTrip(user.id, id),
    listModules(user.id),
    listCategories(user.id),
    listItems(user.id),
    listBags(user.id),
    listTasks(user.id),
  ]);

  if (!trip) notFound();

  // Bag picker options: active bags, plus any inactive bag this trip still
  // uses, so a retired bag's existing assignments stay visible/selectable.
  const inUse = new Set(trip.bags.map((b) => b.id));
  const bagOptions = allBags.filter((b) => b.active || inUse.has(b.id));
  const bagSummary = trip.bags.map((bag) => {
    const bagItems = trip.tripItems.filter((ti) => !ti.removed && ti.bagId === bag.id);
    return { bag, count: bagItems.length, packed: bagItems.filter((ti) => ti.packed).length };
  });

  const pickerItems = buildPickerItems(items, trip.tripItems);
  const taskPickerItems = buildTaskPickerItems(tasks, trip.tripTasks);
  const tripTasks = trip.tripTasks.filter((t) => !t.removed);
  const departureTasks = tripTasks.filter((t) => t.anchor === "DEPARTURE");
  const returnTasks = tripTasks.filter((t) => t.anchor === "RETURN");

  const dateRange = formatDateRange(trip.startDate, trip.endDate);
  const allCategories = allCategoriesOf(trip);
  const groups = groupTripItems(visibleTripItems(trip, parsed), view);
  const basePath = `/trips/${trip.id}`;

  const viewLink = (v: string) => buildViewLink(basePath, parsed, { view: v });
  const filterLink = (f: string) => buildViewLink(basePath, parsed, { filter: f });
  const scopeLink = (s: string) => buildViewLink(basePath, parsed, { scope: s });
  const printLink = buildViewLink(`${basePath}/print`, parsed, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{trip.name}</h1>
          {(trip.destination || dateRange) && (
            <p className="text-muted-foreground">
              {[trip.destination, dateRange].filter(Boolean).join(" — ")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={`/trips/${trip.id}/edit`}>Edit</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/trips/${trip.id}/duplicate`}>Duplicate</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={printLink}>Print</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={`${basePath}/export?format=json`}>Export JSON</a>
          </Button>
          <Button asChild variant="outline">
            <a href={`${basePath}/export?format=csv`}>Export CSV</a>
          </Button>
          <form action={deleteTripAction}>
            <input type="hidden" name="tripId" value={trip.id} />
            <ConfirmSubmitButton
              confirmMessage={`Delete trip "${trip.name}"? This permanently removes all its items.`}
              variant="outline"
              className="text-destructive hover:text-destructive"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium">Pre-Departure</h2>
          {departureTasks.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {departureTasks.filter((t) => t.done).length}/{departureTasks.length} done
            </span>
          )}
        </div>
        {departureTasks.length > 0 ? (
          <>
            <TaskChecklist tasks={departureTasks} anchor="DEPARTURE" trip={trip} />
            {!trip.startDate && (
              <p className="text-xs text-muted-foreground">Set the trip&rsquo;s start date to see when each group is due.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No pre-departure tasks yet. Tasks come from this trip&rsquo;s modules, or add them below.
          </p>
        )}
        <details className="rounded-md border px-3 py-2 [&[open]]:pb-3">
          <summary className="cursor-pointer text-sm font-medium">Add tasks</summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <AddExistingPicker
              items={taskPickerItems}
              tripId={trip.id}
              action={addTasksToTripAction}
              fieldName="taskIds"
              title="Existing tasks"
              description="Search your Tasks list. A task brings its sub-tasks along."
              placeholder="Search tasks to add…"
              noun="task"
            />
            <ActionForm resetOnSuccess action={addCustomTaskAction} className="flex flex-col gap-3 rounded-lg border p-4">
              <h3 className="font-medium">One-off task</h3>
              <input type="hidden" name="tripId" value={trip.id} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="taskName">Task</Label>
                <Input id="taskName" name="name" placeholder="e.g. Drop off spare key" required />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <TimingFields idPrefix="custom-task" />
              </div>
              <Button type="submit" variant="secondary" className="w-fit">
                Add task
              </Button>
            </ActionForm>
          </div>
        </details>
      </section>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1 rounded-full bg-muted p-1">
          <Link href={viewLink("category")} className={pillClass(view === "category")}>
            By Category
          </Link>
          <Link href={viewLink("bag")} className={pillClass(view === "bag")}>
            By Bag
          </Link>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted p-1">
          <Link href={filterLink("all")} className={pillClass(filter === "all")}>
            All
          </Link>
          <Link href={filterLink("packed")} className={pillClass(filter === "packed")}>
            Packed
          </Link>
          <Link href={filterLink("unpacked")} className={pillClass(filter === "unpacked")}>
            Unpacked
          </Link>
        </div>
        <ScopeSelect
          scope={scope}
          allHref={scopeLink("all")}
          categories={allCategories.map((c) => ({ scope: `category:${c}`, label: c, href: scopeLink(`category:${c}`) }))}
          bags={
            trip.bags.length > 0
              ? [
                  ...trip.bags.map((bag) => ({ scope: `bag:${bag.id}`, label: bag.name, href: scopeLink(`bag:${bag.id}`) })),
                  { scope: "bag:unassigned", label: "Unassigned", href: scopeLink("bag:unassigned") },
                ]
              : []
          }
        />
      </div>

      <PackingList groups={[...groups.entries()]} bags={bagOptions} tripId={trip.id} />

      {returnTasks.length > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-medium">After Return</h2>
            <span className="text-sm text-muted-foreground">
              {returnTasks.filter((t) => t.done).length}/{returnTasks.length} done
            </span>
          </div>
          <TaskChecklist tasks={returnTasks} anchor="RETURN" trip={trip} />
        </section>
      )}

      <AddExistingPicker
        items={pickerItems}
        tripId={trip.id}
        action={addItemsToTripAction}
        fieldName="itemIds"
        title="Add existing items"
        description="Search your master list. Each item brings its child items along, the same as it would through a module."
        placeholder="Search items to add…"
        noun="item"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <form action={addCustomItemAction} className="flex flex-col gap-3 rounded-lg border p-4">
          <h3 className="font-medium">Add custom item</h3>
          <input type="hidden" name="tripId" value={trip.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" placeholder="Miscellaneous" list="category-options" />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} className="w-24" />
          </div>
          <Button type="submit" className="w-fit">
            Add item
          </Button>
        </form>

        {modules.length > 0 && (
          <form action={addModulesToTripAction} className="flex flex-col gap-3 rounded-lg border p-4">
            <h3 className="font-medium">Add modules to this trip</h3>
            <input type="hidden" name="tripId" value={trip.id} />
            <div className="flex flex-wrap gap-4">
              {modules.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <Checkbox name="moduleIds" value={m.id} />
                  {m.name}
                </label>
              ))}
            </div>
            <Button type="submit" className="w-fit" variant="secondary">
              Merge modules in
            </Button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-medium">Bags on this trip</h3>
          <Link href="/bags" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Manage bags
          </Link>
        </div>
        {bagSummary.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {bagSummary.map(({ bag, count, packed }) => (
              <li key={bag.id} className="flex items-baseline justify-between gap-3 border-b pb-1 last:border-b-0">
                <span>
                  {bag.name}
                  {[bag.bagType, bag.color].some(Boolean) && (
                    <span className="ml-2 text-muted-foreground">{[bag.bagType, bag.color].filter(Boolean).join(", ")}</span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {packed}/{count} packed
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No items are assigned to a bag yet. Items with a default bag land in it automatically when added to a
            trip; otherwise pick a bag on each item above.
          </p>
        )}
        <form action={createBagAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="tripId" value={trip.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bagName">New bag</Label>
            <Input id="bagName" name="name" placeholder="e.g. Borrowed Duffel" required className="w-56" />
          </div>
          <Button type="submit" variant="secondary">
            Create bag
          </Button>
          <p className="basis-full text-xs text-muted-foreground">
            Adds it to your Bags list so you can assign items to it here and on future trips. If it&rsquo;s a
            one-off, mark it inactive on the Bags page afterward. This trip keeps showing it.
          </p>
        </form>
      </div>
    </div>
  );
}

/**
 * Active master Items for the "add items" picker, each with the names of
 * everything that comes along with it (recursive children, cycle-safe) and
 * whether it's already on this trip (not counting removed trip items).
 */
function buildPickerItems(
  items: Awaited<ReturnType<typeof listItems>>,
  tripItems: { sourceItemId: string | null; removed: boolean }[]
): PickerItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const onTrip = new Set(tripItems.filter((t) => !t.removed).map((t) => t.sourceItemId));

  function includes(rootId: string) {
    const seen = new Set<string>([rootId]);
    const names: string[] = [];
    const queue = [rootId];
    while (queue.length > 0) {
      for (const link of byId.get(queue.shift()!)?.childLinks ?? []) {
        if (seen.has(link.childItem.id)) continue;
        seen.add(link.childItem.id);
        names.push(link.childItem.name);
        queue.push(link.childItem.id);
      }
    }
    return names;
  }

  return items
    .filter((i) => i.active)
    .map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category.name,
      notes: i.notes,
      includes: includes(i.id),
      onTrip: onTrip.has(i.id),
    }));
}

/**
 * Active master Tasks for the "add tasks" picker: grouped by when they're
 * due, with their sub-tasks listed, and flagged if already on this trip.
 */
function buildTaskPickerItems(
  tasks: Awaited<ReturnType<typeof listTasks>>,
  tripTasks: { sourceTaskId: string | null; removed: boolean }[]
): PickerItem[] {
  const onTrip = new Set(tripTasks.filter((t) => !t.removed).map((t) => t.sourceTaskId));
  return tasks
    .filter((t) => t.active)
    .map((t) => ({
      id: t.id,
      name: t.name,
      category: timingLabel(t.anchor, t.offsetDays ?? t.parent?.offsetDays ?? 0),
      notes: t.notes,
      includes: t.children.filter((c) => c.active).map((c) => c.name),
      onTrip: onTrip.has(t.id),
    }));
}
