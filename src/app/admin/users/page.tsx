import { getCurrentAdmin } from "@/lib/session";
import { listUsers } from "@/services/userService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createUserAction, setUserActiveAction, resetPasswordAction } from "./actions";

// Per-admin data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await getCurrentAdmin();
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted-foreground">
          Accounts are admin-created — there is no self-service signup (DESIGN.md
          &ldquo;Account provisioning&rdquo;). Password resets are admin-driven too, since
          Version 1 has no mail server.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reset password</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                {u.displayUsername ?? u.username}
                {u.id === admin.id && <span className="text-muted-foreground"> (you)</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">{u.isAdmin ? "Admin" : "User"}</TableCell>
              <TableCell>
                <form action={setUserActiveAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="active" value={(!u.isActive).toString()} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={u.isActive ? "outline" : "secondary"}
                    disabled={u.id === admin.id && u.isActive}
                    title={u.id === admin.id && u.isActive ? "You cannot deactivate your own account" : undefined}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </Button>
                </form>
              </TableCell>
              <TableCell>
                <form action={resetPasswordAction} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <Input
                    name="newPassword"
                    type="password"
                    placeholder="New password"
                    required
                    className="h-8 w-40"
                  />
                  <Button type="submit" size="sm" variant="ghost">
                    Set
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ActionForm resetOnSuccess action={createUserAction} className="flex flex-col gap-4 rounded-lg border p-4">
        <h3 className="font-medium">Create user</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Initial password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
        </div>
        <label className="flex w-fit items-center gap-2 text-sm">
          <input type="checkbox" name="isAdmin" />
          Admin
        </label>
        <Button type="submit" className="w-fit">
          Create user
        </Button>
      </ActionForm>
    </div>
  );
}
