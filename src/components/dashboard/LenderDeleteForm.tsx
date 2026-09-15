"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ManagedLender } from "@/db/queries/lenders";
import {
  deleteUnusedLenderAction,
  type LenderActionState,
} from "@/lib/lender-actions";

type LenderDeleteFormProps = {
  lender: ManagedLender;
  onSuccess: () => void;
  onCancel: () => void;
};

const initialState: LenderActionState = { ok: false };

export function LenderDeleteForm({
  lender,
  onSuccess,
  onCancel,
}: LenderDeleteFormProps) {
  const [state, formAction, pending] = useActionState(
    deleteUnusedLenderAction,
    initialState,
  );
  const handledSuccess = useRef(false);

  useEffect(() => {
    if (state.ok && !handledSuccess.current) {
      handledSuccess.current = true;
      onSuccess();
    }
    if (!state.ok) {
      handledSuccess.current = false;
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={lender.id} />

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
        >
          {state.error}
        </div>
      ) : null}

      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-dba-charcoal">
          Geldverstrekker verwijderen?
        </h3>
        <p className="mt-2 text-sm leading-6 text-dba-charcoal">
          &lsquo;{lender.name}&rsquo; is niet aan dossiers gekoppeld en wordt
          definitief verwijderd.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-dba-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-lg border border-dba-border bg-white px-4 text-sm font-medium text-dba-charcoal transition-colors hover:bg-dba-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-dark-green focus-visible:ring-offset-2 disabled:opacity-60"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={pending}
          autoFocus
          className="inline-flex h-10 items-center rounded-lg bg-red-700 px-4 text-sm font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {pending ? "Verwijderen…" : "Definitief verwijderen"}
        </button>
      </div>
    </form>
  );
}
