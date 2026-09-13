"use client";

import { useActionState, useEffect, useRef } from "react";
import type { AdvisorOption } from "@/db/queries/advisors";
import type { LenderOption } from "@/db/queries/lenders";
import type { MortgageCaseDetail } from "@/db/queries/mortgage-cases";
import type { MortgagePhase as DbMortgagePhase } from "@/db/schema";
import {
  createMortgageCaseAction,
  updateMortgageCaseAction,
  type MortgageActionState,
} from "@/lib/mortgage-actions";
import {
  amountForInput,
  dateForInput,
  PHASE_OPTIONS,
} from "@/lib/mortgage-validation";

type MortgageFormProps = {
  mode: "create" | "edit";
  defaultPhase: DbMortgagePhase;
  advisors: AdvisorOption[];
  lenders: LenderOption[];
  initial?: MortgageCaseDetail | null;
  onSuccess: () => void;
  onCancel: () => void;
};

const initialState: MortgageActionState = { ok: false };

const fieldClass =
  "h-10 w-full rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1";

const labelClass = "mb-1.5 block text-[13px] font-medium text-dba-charcoal";

function Field({
  label,
  htmlFor,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-[12px] text-red-700">{error}</p> : null}
    </div>
  );
}

export function MortgageForm({
  mode,
  defaultPhase,
  advisors,
  lenders,
  initial,
  onSuccess,
  onCancel,
}: MortgageFormProps) {
  const action =
    mode === "create" ? createMortgageCaseAction : updateMortgageCaseAction;
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

  const phase = initial?.phase ?? defaultPhase;

  return (
    <form action={formAction} className="flex h-full flex-col">
      {mode === "edit" && initial ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {state.error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
          >
            {state.error}
          </div>
        ) : null}

        <Field
          label="Klantnaam *"
          htmlFor="customerName"
          error={state.fieldErrors?.customerName}
        >
          <input
            id="customerName"
            name="customerName"
            type="text"
            required
            defaultValue={initial?.customerName ?? ""}
            className={fieldClass}
            autoComplete="off"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Adviseur" htmlFor="advisorId">
            <select
              id="advisorId"
              name="advisorId"
              defaultValue={initial?.advisorId ?? ""}
              className={fieldClass}
            >
              <option value="">—</option>
              {advisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.name}
                  {!advisor.active ? " (inactief)" : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Geldverstrekker" htmlFor="lenderId">
            <select
              id="lenderId"
              name="lenderId"
              defaultValue={initial?.lenderId ?? ""}
              className={fieldClass}
            >
              <option value="">—</option>
              {lenders.map((lender) => (
                <option key={lender.id} value={lender.id}>
                  {lender.name}
                  {!lender.active ? " (inactief)" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Soort hypotheek" htmlFor="mortgageType">
            <input
              id="mortgageType"
              name="mortgageType"
              type="text"
              defaultValue={initial?.mortgageType ?? ""}
              className={fieldClass}
              placeholder="Bijv. Annuïteit"
            />
          </Field>

          <Field label="Fase" htmlFor="phase">
            <select
              id="phase"
              name="phase"
              defaultValue={phase}
              className={fieldClass}
            >
              {PHASE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Hoofdsom"
            htmlFor="principalAmount"
            error={state.fieldErrors?.principalAmount}
          >
            <input
              id="principalAmount"
              name="principalAmount"
              type="text"
              inputMode="decimal"
              defaultValue={amountForInput(initial?.principalAmount)}
              className={fieldClass}
              placeholder="450000"
            />
          </Field>

          <Field
            label="Tarief / vergoeding"
            htmlFor="fee"
            error={state.fieldErrors?.fee}
          >
            <input
              id="fee"
              name="fee"
              type="text"
              inputMode="decimal"
              defaultValue={amountForInput(initial?.fee)}
              className={fieldClass}
              placeholder="2500"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Datum aanvraag"
            htmlFor="applicationDate"
            error={state.fieldErrors?.applicationDate}
          >
            <input
              id="applicationDate"
              name="applicationDate"
              type="date"
              defaultValue={dateForInput(initial?.applicationDate)}
              className={fieldClass}
            />
          </Field>

          <Field
            label="Datum laatste controle"
            htmlFor="lastCheckDate"
            error={state.fieldErrors?.lastCheckDate}
          >
            <input
              id="lastCheckDate"
              name="lastCheckDate"
              type="date"
              defaultValue={dateForInput(initial?.lastCheckDate)}
              className={fieldClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Datum ontbindende voorwaarden"
            htmlFor="financingConditionDate"
            error={state.fieldErrors?.financingConditionDate}
          >
            <input
              id="financingConditionDate"
              name="financingConditionDate"
              type="date"
              defaultValue={dateForInput(initial?.financingConditionDate)}
              className={fieldClass}
            />
          </Field>

          <Field
            label="Passeerdatum"
            htmlFor="passingDate"
            error={state.fieldErrors?.passingDate}
          >
            <input
              id="passingDate"
              name="passingDate"
              type="date"
              defaultValue={dateForInput(initial?.passingDate)}
              className={fieldClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Bankgarantie / waarborgsom" htmlFor="bankGuarantee">
            <input
              id="bankGuarantee"
              name="bankGuarantee"
              type="text"
              defaultValue={initial?.bankGuarantee ?? ""}
              className={fieldClass}
            />
          </Field>

          <Field label="Bevestiging hypotheek" htmlFor="mortgageConfirmation">
            <input
              id="mortgageConfirmation"
              name="mortgageConfirmation"
              type="text"
              defaultValue={initial?.mortgageConfirmation ?? ""}
              className={fieldClass}
            />
          </Field>
        </div>

        <Field label="Opmerkingen" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={initial?.notes ?? ""}
            className="w-full rounded-lg border border-dba-border bg-dba-background px-3 py-2 text-sm text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-dba-border px-6 py-4">
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
              ? "Dossier toevoegen"
              : "Wijzigingen opslaan"}
        </button>
      </div>
    </form>
  );
}
