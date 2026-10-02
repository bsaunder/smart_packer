import { getCurrentUser } from "@/lib/session";
import { listTasks } from "@/services/taskService";

// Per-user data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";
import { TimingFields } from "@/components/timing-fields";
import { createTaskAction } from "./actions";
import { ParentSelect } from "./parent-select";
import { TasksTable } from "./tasks-table";

export default async function TasksPage() {
  const user = await getCurrentUser();
  const tasks = await listTasks(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Things to do before you leave (take out the garbage, board the dog) or after you get back, each timed
          from the trip&rsquo;s dates. Add tasks to modules, or pick them on a trip, and they show up on its
          Pre-Departure / After Return checklist.
        </p>
      </div>

      <ActionForm resetOnSuccess action={createTaskAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">New task</Label>
          <Input id="name" name="name" placeholder="e.g. Take out Garbage" required className="w-56" />
        </div>
        <TimingFields allowInherit={tasks.length > 0} />
        {tasks.length > 0 && <ParentSelect tasks={tasks} />}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" name="notes" placeholder="optional" className="w-48" />
        </div>
        <Button type="submit">Add task</Button>
      </ActionForm>

      <TasksTable tasks={tasks} />
    </div>
  );
}
