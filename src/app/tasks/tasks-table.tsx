"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { timingLabel, type Anchor } from "@/lib/taskTiming";
import { cn } from "@/lib/utils";
import { deleteTaskAction, setTaskActiveAction } from "./actions";

type Task = {
  id: string;
  name: string;
  notes: string | null;
  active: boolean;
  anchor: Anchor;
  offsetDays: number | null;
  parentId: string | null;
  parent: { offsetDays: number | null } | null;
  children: { id: string }[];
  moduleTasks: { module: { name: string } }[];
};

/** Top-level tasks, each followed by its sub-tasks, in timeline order then by name. */
function ordered(tasks: Task[]) {
  const byParent = new Map<string, Task[]>();
  for (const t of tasks) if (t.parentId) byParent.set(t.parentId, [...(byParent.get(t.parentId) ?? []), t]);
  const rank = (t: Task) => (t.anchor === "DEPARTURE" ? -(t.offsetDays ?? 0) : 1000 + (t.offsetDays ?? 0));
  return tasks
    .filter((t) => !t.parentId)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .flatMap((t) => [t, ...(byParent.get(t.id) ?? [])]);
}

export function TasksTable({ tasks }: { tasks: Task[] }) {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = ordered(tasks);
    if (!q) return all;
    // Keep a matching sub-task's parent visible for context.
    const matches = new Set(
      all.filter((t) => t.name.toLowerCase().includes(q) || (t.notes?.toLowerCase().includes(q) ?? false)).map((t) => t.id)
    );
    return all.filter((t) => matches.has(t.id) || (!t.parentId && tasks.some((c) => c.parentId === t.id && matches.has(c.id))));
  }, [tasks, search]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        placeholder="Search tasks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>When</TableHead>
            <TableHead>Modules</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((task) => {
            const days = task.offsetDays ?? task.parent?.offsetDays ?? 0;
            return (
              <TableRow key={task.id} className={task.active ? "" : "text-muted-foreground"}>
                <TableCell className={cn("whitespace-normal", task.parentId && "pl-8")}>
                  {task.parentId && <span className="mr-1 text-muted-foreground">↳</span>}
                  {task.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {timingLabel(task.anchor, days)}
                  {task.parentId && task.offsetDays === null && <span className="text-xs"> (parent&rsquo;s)</span>}
                </TableCell>
                <TableCell className="max-w-48 whitespace-normal text-muted-foreground">
                  {task.moduleTasks.map((mt) => mt.module.name).join(", ")}
                </TableCell>
                <TableCell className="max-w-xs whitespace-normal text-muted-foreground">{task.notes}</TableCell>
                <TableCell>
                  <form action={setTaskActiveAction}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="active" value={(!task.active).toString()} />
                    <Button type="submit" size="sm" variant={task.active ? "outline" : "secondary"} aria-pressed={task.active}>
                      {task.active ? "Active" : "Inactive"}
                    </Button>
                  </form>
                </TableCell>
                <TableCell className="flex items-center gap-1">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/tasks/${task.id}/edit`}>Edit</Link>
                  </Button>
                  <form action={deleteTaskAction}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <ConfirmSubmitButton
                      confirmMessage={
                        task.children.length > 0
                          ? `Delete task "${task.name}"? Its ${task.children.length} sub-task${task.children.length === 1 ? "" : "s"} will become top-level tasks. Existing trips keep their copies.`
                          : `Delete task "${task.name}"? Existing trips keep their copies.`
                      }
                      size="sm"
                      variant="ghost"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {search ? `No tasks match "${search}".` : "No tasks yet."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
