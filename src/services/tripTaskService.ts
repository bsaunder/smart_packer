import { prisma } from "@/lib/prisma";
import { dueDate, startOfToday, type Anchor } from "@/lib/taskTiming";

/**
 * Trip Tasks (DESIGN.md 1.12): per-Trip snapshots of master Tasks, mirroring
 * how Trip Items snapshot Items. A Task arriving on a Trip brings its active
 * sub-tasks; timing is resolved to a concrete offset at that moment.
 */

/** Active Tasks with these ids plus their active sub-tasks, scoped to the owner. */
async function expandWithChildren(ownerId: string, taskIds: string[]) {
  const tasks = await prisma.task.findMany({
    where: {
      ownerId,
      active: true,
      OR: [{ id: { in: taskIds } }, { parentId: { in: taskIds } }],
    },
    include: { parent: true },
  });
  return tasks;
}

/**
 * Snapshots each Task not already on the Trip (removed or not) into a Trip
 * Task, linking sub-tasks to their parent's Trip Task when it's on the Trip.
 */
async function createTripTasksFor(ownerId: string, tripId: string, taskIds: string[]) {
  const tasks = await expandWithChildren(ownerId, taskIds);
  if (tasks.length === 0) return { added: 0 };

  const onTrip = await prisma.tripTask.findMany({
    where: { tripId, sourceTaskId: { not: null } },
    select: { id: true, sourceTaskId: true },
  });
  const tripTaskIdBySource = new Map(onTrip.map((t) => [t.sourceTaskId!, t.id]));
  const toAdd = tasks.filter((t) => !tripTaskIdBySource.has(t.id));

  // Parents first, so sub-tasks can point at their parent's new Trip Task.
  const ordered = [...toAdd.filter((t) => !t.parentId), ...toAdd.filter((t) => t.parentId)];
  for (const task of ordered) {
    const created = await prisma.tripTask.create({
      data: {
        tripId,
        sourceTaskId: task.id,
        parentId: task.parentId ? (tripTaskIdBySource.get(task.parentId) ?? null) : null,
        name: task.name,
        notes: task.notes,
        anchor: task.anchor,
        offsetDays: task.offsetDays ?? task.parent?.offsetDays ?? 0,
      },
    });
    tripTaskIdBySource.set(task.id, created.id);
  }
  return { added: ordered.length };
}

/** Module Tasks (with their sub-tasks) merged into a Trip at generation / later module merges. */
export async function mergeModuleTasksIntoTrip(ownerId: string, tripId: string, moduleIds: string[]) {
  const moduleTasks = await prisma.moduleTask.findMany({
    where: { moduleId: { in: moduleIds }, module: { ownerId } },
    select: { taskId: true },
  });
  return createTripTasksFor(ownerId, tripId, [...new Set(moduleTasks.map((mt) => mt.taskId))]);
}

/**
 * Adds specific master Tasks (and their sub-tasks) to a Trip. Like adding
 * Items by name (FR-019a), anything previously removed from this Trip is
 * restored, since picking it is an explicit request.
 */
export async function addTasksToTrip(ownerId: string, tripId: string, taskIds: string[]) {
  await assertOwnsTrip(ownerId, tripId);
  const expanded = await expandWithChildren(ownerId, taskIds);
  const { count: restored } = await prisma.tripTask.updateMany({
    where: { tripId, removed: true, sourceTaskId: { in: expanded.map((t) => t.id) } },
    data: { removed: false },
  });
  const { added } = await createTripTasksFor(ownerId, tripId, taskIds);
  return { added, restored };
}

/** A one-off task for this Trip only (like a custom Trip Item). */
export async function addCustomTripTask(
  ownerId: string,
  tripId: string,
  input: { name: string; anchor: Anchor; offsetDays: number; notes?: string }
) {
  await assertOwnsTrip(ownerId, tripId);
  return prisma.tripTask.create({
    data: { tripId, name: input.name, anchor: input.anchor, offsetDays: input.offsetDays, notes: input.notes || null },
  });
}

/** Sub-tasks are checked off independently of their parent, and vice versa. */
export async function setTripTaskDone(ownerId: string, tripTaskId: string, done: boolean) {
  await assertOwnsTripTask(ownerId, tripTaskId);
  return prisma.tripTask.update({
    where: { id: tripTaskId },
    data: { done, doneAt: done ? new Date() : null },
  });
}

/**
 * Removes a task from this Trip only, along with its sub-tasks (which, unlike
 * child Items, belong to their parent alone). Master Tasks are untouched.
 */
export async function removeTripTask(ownerId: string, tripTaskId: string) {
  await assertOwnsTripTask(ownerId, tripTaskId);
  await prisma.tripTask.updateMany({
    where: { OR: [{ id: tripTaskId }, { parentId: tripTaskId }] },
    data: { removed: true },
  });
}

/**
 * The Dashboard's "Due soon": unfinished tasks due within the next week, or
 * already overdue, soonest first. Overdue tasks always show while their
 * trip hasn't ended yet; once it has, only for two weeks, so a forgotten
 * task from an old trip doesn't linger on the Dashboard forever.
 */
export async function listDueSoonTasks(ownerId: string) {
  const tasks = await prisma.tripTask.findMany({
    where: { done: false, removed: false, trip: { ownerId } },
    include: { trip: { select: { id: true, name: true, startDate: true, endDate: true } } },
  });

  const today = startOfToday();
  const from = new Date(today);
  from.setDate(from.getDate() - 14);
  const until = new Date(today);
  until.setDate(until.getDate() + 7);

  return tasks
    .map((t) => ({ ...t, due: dueDate(t.trip, t.anchor, t.offsetDays) }))
    .filter((t): t is typeof t & { due: Date } => {
      if (t.due === null || t.due > until) return false;
      const tripEnd = t.trip.endDate ?? t.trip.startDate;
      return t.due >= from || (tripEnd !== null && tripEnd >= today);
    })
    .map((t) => ({ ...t, overdue: t.due < today }))
    .sort((a, b) => a.due.getTime() - b.due.getTime() || a.name.localeCompare(b.name));
}

async function assertOwnsTrip(ownerId: string, tripId: string) {
  const count = await prisma.trip.count({ where: { id: tripId, ownerId } });
  if (!count) throw new Error("Trip not found for this owner.");
}

async function assertOwnsTripTask(ownerId: string, tripTaskId: string) {
  const count = await prisma.tripTask.count({ where: { id: tripTaskId, trip: { ownerId } } });
  if (!count) throw new Error("Trip task not found for this owner.");
}
