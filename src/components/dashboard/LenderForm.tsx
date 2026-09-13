"use client";

import { useActionState, useEffect, useRef } from "react";
import type { LenderOption } from "@/db/queries/lenders";
import {
  createLenderAction,
  updateLenderAction,
  type LenderActionState,
} from "@/lib/lender-actions";

type LenderFormProps = {
  mode: "create" | "edit";
  initial?: LenderOption | null;
  onSuccess: () => void;
  onCancel: () => void;
};

const initialState: LenderActionState = { ok: false };

const fieldClass =
  "h-10 w-full rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1";

export function LenderForm({
  mode,
  initial,
  onSuccess,
  onCancel,
}: LenderFormProps) {
  const action =
    mode === "create" ? createLenderAction : updateLenderAction;
  const [state, formAction, pending] = useActionState(action, initialState);
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

  const defaultActive = initial?.active ?? true;

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" && initial ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
        >
          {state.error}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="lender-name"
          className="mb-1.5 block text-[13px] font-medium text-dba-charcoal"
        >
          Naam *
        </label>
        <input
          id="lender-name"
          name="name"
          type="text"
          required
          autoComplete="off"
          defaultValue={initial?.name ?? ""}
          className={fieldClass}
        />
        {state.fieldErrors?.name ? (
          <p className="mt-1 text-[12px] text-red-700">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-dba-charcoal">Status</p>
        <label className="inline-flex items-center gap-2 text-sm text-dba-charcoal">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={defaultActive}
            className="h-4 w-4 rounded border-dba-border text-dba-dark-green focus-visible:ring-dba-green"
          />
          Actief
        </label>
        <p className="mt-1.5 text-[12px] text-dba-muted">
          Inactieve geldverstrekkers blijven gekoppeld aan bestaande dossiers,
          maar verschijnen niet standaard in nieuwe dossiers.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-dba-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center rounded-lg border border-dba-border bg-white px-4 text-sm font-medium text-dba-charcoal transition-colors hover:bg-dba-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-2"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-lg bg-dba-dark-green px-4 text-sm font-medium text-white transition-colors hover:bg-dba-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-dark-green focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {pending
            ? "Opslaan…"
            : mode === "create"
              ? "Geldverstrekker toevoegen"
              : "Wijzigingen opslaan"}
        </button>
      </div>
    </form>
  );
}
