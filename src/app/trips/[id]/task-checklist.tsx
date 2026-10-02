import { Square, SquareCheck, X } from "lucide-react";
import { formatDate } from "@/lib/formatDate";
import { dueDate, groupTasks, startOfToday, type Anchor } from "@/lib/taskTiming";
import { cn } from "@/lib/utils";
import { removeTripTaskAction, toggleTaskDoneAction } from "./actions";

type TripTask = {
  id: string;
  parentId: string | null;
  name: string;
  notes: string | null;
  anchor: Anchor;
  offsetDays: number;
  done: boolean;
};

/**
 * One checklist (Pre-Departure or After Return) on the trip page: timeframe
 * groups in the order they happen, each with its due date when the trip has
 * dates. A group with unfinished tasks past its due date is flagged overdue.
 */
export function TaskChecklist({
  tasks,
  anchor,
  trip,
}: {
  tasks: TripTask[];
  anchor: Anchor;
  trip: { id: string; startDate: Date | null; endDate: Date | null };
}) {
  const groups = groupTasks(tasks, anchor);
  const today = startOfToday();

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const due = dueDate(trip, anchor, group.days);
        const all = group.tasks.flatMap(({ task, children }) => [task, ...children]);
        const overdue = due !== null && due < today && all.some((t) => !t.done);
        return (
          <div key={group.days} className="flex flex-col gap-1">
            <h4 className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
              {group.label}
              {due && (
                <span className={cn("text-xs font-normal", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {overdue ? "overdue · was due " : "due "}
                  {formatDate(due)}
                </span>
              )}
            </h4>
            <ul className="flex flex-col">
              {group.tasks.map(({ task, children, parentName }) => (
                <li key={task.id}>
                  <TaskRow task={task} tripId={trip.id} parentName={parentName} />
                  {children.length > 0 && (
                    <ul className="ml-7 flex flex-col">
                      {children.map((child) => (
                        <li key={child.id}>
                          <TaskRow task={child} tripId={trip.id} />
                        </li>
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
  );
}

function TaskRow({ task, tripId, parentName }: { task: TripTask; tripId: string; parentName?: string }) {
  return (
    <div className="flex items-start gap-2 py-0.5 text-sm">
      <form action={toggleTaskDoneAction}>
        <input type="hidden" name="tripTaskId" value={task.id} />
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="done" value={(!task.done).toString()} />
        <button
          type="submit"
          aria-pressed={task.done}
          aria-label={task.done ? `Mark "${task.name}" not done` : `Mark "${task.name}" done`}
          className="mt-0.5 text-muted-foreground hover:text-foreground"
        >
          {task.done ? <SquareCheck className="size-4 text-primary" /> : <Square className="size-4" />}
        </button>
      </form>
      <span className={cn("flex-1", task.done && "text-muted-foreground line-through")}>
        {task.name}
        {parentName && <span className="text-muted-foreground"> · {parentName}</span>}
        {task.notes && <span className="ml-2 text-xs text-muted-foreground no-underline">{task.notes}</span>}
      </span>
      <form action={removeTripTaskAction}>
        <input type="hidden" name="tripTaskId" value={task.id} />
        <input type="hidden" name="tripId" value={tripId} />
        <button
          type="submit"
          title="Remove from this trip"
          aria-label={`Remove "${task.name}" from this trip`}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="size-4" />
        </button>
      </form>
    </div>
  );
}
