"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ManagedLender } from "@/db/queries/lenders";
import {
  mergeLenderAction,
  type LenderActionState,
} from "@/lib/lender-actions";

type LenderMergeFormProps = {
  source: ManagedLender;
  lenders: ManagedLender[];
  onSuccess: () => void;
  onCancel: () => void;
};

const initialState: LenderActionState = { ok: false };

export function LenderMergeForm({
  source,
  lenders,
  onSuccess,
  onCancel,
}: LenderMergeFormProps) {
  const [targetId, setTargetId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    mergeLenderAction,
    initialState,
  );
  const handledSuccess = useRef(false);
  const targets = useMemo(
    () => lenders.filter((lender) => lender.id !== source.id),
    [lenders, source.id],
  );
  const target = targets.find((lender) => lender.id === targetId) ?? null;

  useEffect(() => {
    if (state.ok && !handledSuccess.current) {
      handledSuccess.current = true;
      onSuccess();
    }
    if (!state.ok) {
      handledSuccess.current = false;
    }
  }, [state, onSuccess]);

  if (!confirming) {
    return (
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (target) setConfirming(true);
        }}
      >
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-dba-charcoal">
            Bron
          </p>
          <div className="rounded-lg border border-dba-border bg-dba-background px-3 py-2.5 text-sm font-medium text-dba-charcoal">
            {source.name}
          </div>
          <p className="mt-1.5 text-[12px] text-dba-muted">
            {source.caseCount} dossier{source.caseCount === 1 ? "" : "s"} wordt
            omgekoppeld.
          </p>
        </div>

        <div>
          <label
            htmlFor="merge-target"
            className="mb-1.5 block text-[13px] font-medium text-dba-charcoal"
          >
            Doel
          </label>
          <select
            id="merge-target"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            required
            autoFocus
            className="h-10 w-full rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus-visible:border-dba-dark-green focus-visible:ring-2 focus-visible:ring-dba-dark-green focus-visible:ring-offset-1"
          >
            <option value="">Kies een geldverstrekker</option>
            {targets.map((lender) => (
              <option key={lender.id} value={lender.id}>
                {lender.name} ({lender.active ? "actief" : "inactief"})
              </option>
            ))}
          </select>
          {target && !target.active ? (
            <p className="mt-1.5 text-[12px] text-amber-800">
              Het gekozen doel is inactief en blijft dat na de samenvoeging.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-dba-border pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center rounded-lg border border-dba-border bg-white px-4 text-sm font-medium text-dba-charcoal transition-colors hover:bg-dba-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-dark-green focus-visible:ring-offset-2"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={!target}
            className="inline-flex h-10 items-center rounded-lg bg-dba-dark-green px-4 text-sm font-medium text-white transition-colors hover:bg-dba-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-dark-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Samenvoegen
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="sourceId" value={source.id} />
      <input type="hidden" name="targetId" value={targetId} />

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
        >
          {state.error}
        </div>
      ) : null}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="font-semibold text-dba-charcoal">
          Geldverstrekker samenvoegen?
        </h3>
        <p className="mt-2 text-sm leading-6 text-dba-charcoal">
          Alle dossiers van &lsquo;{source.name}&rsquo; worden gekoppeld aan
          &lsquo;{target?.name}&rsquo;. Daarna wordt &lsquo;{source.name}&rsquo;
          verwijderd. Deze actie kan niet automatisch worden teruggedraaid.
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
          disabled={pending || !target}
          autoFocus
          className="inline-flex h-10 items-center rounded-lg bg-red-700 px-4 text-sm font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {pending ? "Samenvoegen…" : "Definitief samenvoegen"}
        </button>
      </div>
    </form>
  );
}
