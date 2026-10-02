import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTask, listTasks } from "@/services/taskService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";
import { TimingFields } from "@/components/timing-fields";
import { updateTaskAction } from "../../actions";
import { ParentSelect } from "../../parent-select";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [task, tasks] = await Promise.all([getTask(user.id, id), listTasks(user.id)]);
  if (!task) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit Task</h1>

      <ActionForm action={updateTaskAction} className="flex flex-col gap-4 rounded-lg border p-4">
        <input type="hidden" name="taskId" value={task.id} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={task.name} required className="w-56" />
          </div>
          <TimingFields anchor={task.anchor} offsetDays={task.offsetDays} allowInherit />
          {/* A task with sub-tasks can't become a sub-task itself, so don't offer it. */}
          {task.children.length === 0 && <ParentSelect tasks={tasks} defaultValue={task.parentId} excludeId={task.id} />}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" defaultValue={task.notes ?? ""} placeholder="optional" className="w-64" />
          </div>
        </div>
        {task.parentId && (
          <p className="text-sm text-muted-foreground">
            Sub-tasks always use their parent&rsquo;s checklist (Pre-Departure or After Return).
          </p>
        )}

        <label className="flex w-fit items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={task.active} />
          Active
        </label>

        <div className="flex gap-3">
          <Button type="submit">Save changes</Button>
          <Button asChild variant="outline">
            <Link href="/tasks">Cancel</Link>
          </Button>
        </div>
      </ActionForm>
    </div>
  );
}
