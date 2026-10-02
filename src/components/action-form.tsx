"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/errors";

/**
 * A form that submits to a server action and shows a returned `{ error }`
 * as a toast instead of an error page (e.g. a duplicate name).
 *
 * Submits via onSubmit rather than `action` because React auto-resets a
 * form after its action runs: on an error the typed values should stay put
 * for a quick fix. `resetOnSuccess` clears "add new" forms after success;
 * edit forms leave it off so their inputs keep showing the saved values.
 */
export function ActionForm({
  action,
  resetOnSuccess = false,
  children,
  ...props
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  resetOnSuccess?: boolean;
} & Omit<React.ComponentProps<"form">, "action" | "onSubmit">) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await action(formData);
      if (result && "error" in result) toast.error(result.error);
      else if (resetOnSuccess) form.reset();
    });
  }

  return (
    <form {...props} onSubmit={onSubmit} aria-busy={pending}>
      {children}
    </form>
  );
}
