"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/** A submit button that blocks the form submission unless the user confirms. */
export function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { confirmMessage: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
