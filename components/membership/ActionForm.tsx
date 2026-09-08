"use client";

import { startTransition, useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/membership/types";

export function ActionForm({ action, children, label, pendingLabel = "처리 중...", disabled = false }: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="space-y-5" aria-busy={pending} onSubmit={event => {
      // Preserve entered values on a returned validation error; the action prop
      // still supports progressive enhancement before JavaScript is available.
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      startTransition(() => submit(form));
    }}>
      <fieldset disabled={pending || disabled} className="min-w-0 space-y-5">
        {children}
        {state.error && <p role="alert" className="text-sm text-coral-300">{state.error}</p>}
        {state.success && <p role="status" className="text-sm text-gold">{state.success}</p>}
        <Button type="submit" disabled={pending || disabled} className="h-11 w-full rounded-pill px-5 font-semibold">
          {pending ? pendingLabel : label}
        </Button>
      </fieldset>
    </form>
  );
}
