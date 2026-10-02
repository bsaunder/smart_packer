import { Button } from "@/components/ui/button";
import { ImportForm } from "./import-form";
import {
  commitItemsImportAction,
  commitTasksImportAction,
  previewItemsImportAction,
  previewTasksImportAction,
} from "./actions";
import { ThemeToggle } from "./theme-toggle";
import { ChangePasswordForm } from "./change-password-form";
import { ApiKeysManager } from "./api-keys-manager";
import { getCurrentUser } from "@/lib/session";
import { listApiKeys } from "@/services/apiKeyService";

// Per-user data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const apiKeys = await listApiKeys(user.id);

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
        <ImportForm
          fileLabel="Items CSV file"
          inputId="items-csv-file"
          previewAction={previewItemsImportAction}
          commitAction={commitItemsImportAction}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Tasks CSV</h2>
          <p className="text-sm text-muted-foreground">
            Your pre-departure / after-return Tasks as a separate CSV, with columns{" "}
            <code>name, days, relative_to, parent, modules, notes, active</code>. Download it as a starting
            template or backup; import upserts by name and never removes anything.
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <a href="/settings/export-tasks" download>
            Download Tasks CSV
          </a>
        </Button>
        <ImportForm
          fileLabel="Tasks CSV file"
          inputId="tasks-csv-file"
          previewAction={previewTasksImportAction}
          commitAction={commitTasksImportAction}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Bearer tokens for the REST API (<code>Authorization: Bearer &lt;key&gt;</code>), for
            scripts or external tools — independent of your browser session.
          </p>
        </div>
        <ApiKeysManager keys={apiKeys} />
      </section>
    </div>
  );
}
