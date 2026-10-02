import { prisma } from "@/lib/prisma";
import { uniqueName, UserError } from "@/lib/errors";
import type { Anchor } from "@/lib/taskTiming";

/**
 * Master Tasks (DESIGN.md 1.12): the pre-departure / post-return checklist,
 * reusable across Trips like Items. One level of sub-tasks; a sub-task
 * always shares its parent's anchor and may inherit its timing
 * (offsetDays null).
 */

type TaskInput = {
  name: string;
  notes?: string | null;
  anchor: Anchor;
  offsetDays: number | null;
  parentId?: string | null;
};

const nameTaken = (name: string) => `You already have a task named "${name}".`;

export async function listTasks(ownerId: string) {
  return prisma.task.findMany({
    where: { ownerId },
    include: {
      parent: true,
      children: { orderBy: { name: "asc" } },
      moduleTasks: { include: { module: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getTask(ownerId: string, taskId: string) {
  return prisma.task.findFirst({ where: { id: taskId, ownerId }, include: { children: true } });
}

/** Validates the parent link and returns the values to store (anchor follows the parent). */
async function resolveParent(ownerId: string, input: TaskInput, taskId?: string) {
  if (!input.parentId) {
    if (input.offsetDays === null) throw new UserError("Choose when this task should be done.");
    return { parentId: null, anchor: input.anchor, offsetDays: input.offsetDays };
  }
  if (input.parentId === taskId) throw new UserError("A task can't be its own sub-task.");

  const parent = await prisma.task.findFirst({ where: { id: input.parentId, ownerId } });
  if (!parent) throw new UserError("That parent task no longer exists.");
  if (parent.parentId) {
    throw new UserError(`"${parent.name}" is itself a sub-task. Sub-tasks can only go one level deep.`);
  }
  if (taskId && (await prisma.task.count({ where: { parentId: taskId } })) > 0) {
    throw new UserError("This task has its own sub-tasks, so it can't become a sub-task. Move or remove them first.");
  }
  return { parentId: parent.id, anchor: parent.anchor, offsetDays: input.offsetDays };
}

export async function createTask(ownerId: string, input: TaskInput) {
  const resolved = await resolveParent(ownerId, input);
  return uniqueName(
    prisma.task.create({ data: { ownerId, name: input.name, notes: input.notes || null, ...resolved } }),
    nameTaken(input.name)
  );
}

export async function updateTask(ownerId: string, taskId: string, input: TaskInput & { active?: boolean }) {
  await assertOwnsTask(ownerId, taskId);
  const resolved = await resolveParent(ownerId, input, taskId);
  return prisma.$transaction(async (tx) => {
    const task = await uniqueName(
      tx.task.update({
        where: { id: taskId },
        data: { name: input.name, notes: input.notes || null, active: input.active, ...resolved },
      }),
      nameTaken(input.name)
    );
    // Sub-tasks always follow their parent's before-departure / after-return anchor.
    await tx.task.updateMany({ where: { parentId: taskId }, data: { anchor: resolved.anchor } });
    return task;
  });
}

export async function setTaskActive(ownerId: string, taskId: string, active: boolean) {
  await assertOwnsTask(ownerId, taskId);
  return prisma.task.update({ where: { id: taskId }, data: { active } });
}

/**
 * Sub-tasks survive as top-level tasks (parentId → null via onDelete:
 * SetNull), first taking the parent's timing if they were inheriting it.
 * Trip snapshots keep their data (TripTask.sourceTaskId → null).
 */
export async function deleteTask(ownerId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, ownerId } });
  if (!task) throw new Error("Task not found for this owner.");
  await prisma.$transaction([
    prisma.task.updateMany({ where: { parentId: taskId, offsetDays: null }, data: { offsetDays: task.offsetDays } }),
    prisma.task.delete({ where: { id: taskId } }),
  ]);
}

export async function assertOwnsTask(ownerId: string, taskId: string) {
  const count = await prisma.task.count({ where: { id: taskId, ownerId } });
  if (!count) throw new Error("Task not found for this owner.");
}
