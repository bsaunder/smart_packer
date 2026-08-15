import { Button } from "@/components/ui/button";
import { ImportForm } from "./import-form";
import { ThemeToggle } from "./theme-toggle";
import { ChangePasswordForm } from "./change-password-form";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Theme</h2>
          <p className="text-sm text-muted-foreground">
            Light, dark, or match your system setting.
          </p>
        </div>
        <ThemeToggle />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Password</h2>
          <p className="text-sm text-muted-foreground">
            Change your own password. This signs you out of any other active sessions.
          </p>
        </div>
        <ChangePasswordForm />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Export master data</h2>
          <p className="text-sm text-muted-foreground">
            Download your Categories, Items, and Modules as a CSV file — useful
            for backup or bulk-editing offline. Re-importing it unchanged is a
            no-op.
          </p>
        </div>
        <Button asChild className="w-fit">
          <a href="/settings/export" download>
            Download CSV
          </a>
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Import master data</h2>
          <p className="text-sm text-muted-foreground">
            Upload an Items CSV to create or update Categories, Items, and
            Modules. The whole file is validated before anything is written —
            fix any listed issues and re-upload if validation fails.
          </p>
        </div>
        <ImportForm />
      </section>
    </div>
  );
}
