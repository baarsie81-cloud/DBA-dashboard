"use client";

import { useTransition } from "react";
import { ArrowDownUp, MoreHorizontal } from "lucide-react";
import { displayText, formatCurrency, formatDateNl } from "@/lib/format";
import type { MortgageDossier } from "@/lib/types";
import { PHASE_OPTIONS } from "@/lib/mortgage-validation";
import type { MortgagePhase as DbMortgagePhase } from "@/db/schema";

type MortgageTableProps = {
  dossiers: MortgageDossier[];
  onEdit?: (id: string) => void;
  onPhaseChange?: (id: string, phase: DbMortgagePhase) => Promise<void> | void;
};

function SortableHeader({
  label,
  align = "left",
}: {
  label: string;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold tracking-wide text-dba-muted uppercase ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <span
        className={`inline-flex items-center gap-1.5 ${
          align === "right" ? "justify-end" : ""
        }`}
      >
        {label}
        <ArrowDownUp
          className="h-3 w-3 text-dba-border-strong"
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
    </th>
  );
}

function phaseValueFromLabel(label: string): DbMortgagePhase {
  return (
    PHASE_OPTIONS.find((option) => option.label === label)?.value ??
    "in_behandeling"
  );
}

function PhaseSelect({
  dossierId,
  phaseLabel,
  onPhaseChange,
}: {
  dossierId: string;
  phaseLabel: string;
  onPhaseChange?: (id: string, phase: DbMortgagePhase) => Promise<void> | void;
}) {
  const [pending, startTransition] = useTransition();
  const value = phaseValueFromLabel(phaseLabel);

  return (
    <select
      key={`${dossierId}-${value}`}
      aria-label="Fase"
      disabled={pending || !onPhaseChange}
      defaultValue={value}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => {
        event.stopPropagation();
        const next = event.target.value as DbMortgagePhase;
        if (!onPhaseChange || next === value) return;
        startTransition(async () => {
          await onPhaseChange(dossierId, next);
        });
      }}
      className="h-8 max-w-[150px] rounded-md border border-dba-border bg-dba-background px-2 text-[12px] font-medium text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1 disabled:opacity-60"
    >
      {PHASE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function MortgageTable({
  dossiers,
  onEdit,
  onPhaseChange,
}: MortgageTableProps) {
  const total = dossiers.length;

  return (
    <section className="overflow-hidden rounded-xl border border-dba-border bg-dba-surface shadow-[0_1px_2px_rgba(51,53,54,0.03)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="border-b border-dba-border bg-[#fafbfa]">
            <tr>
              <SortableHeader label="Klantnaam" />
              <SortableHeader label="Adviseur" />
              <SortableHeader label="Geldverstrekker" />
              <SortableHeader label="Hoofdsom" align="right" />
              <SortableHeader label="Datum aanvraag" />
              <SortableHeader label="Ontbindende v." />
              <SortableHeader label="Passeerdatum" />
              <SortableHeader label="Fase" />
              <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                Acties
              </th>
            </tr>
          </thead>
          <tbody>
            {total === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-dba-muted"
                >
                  Geen dossiers in behandeling.
                </td>
              </tr>
            ) : (
              dossiers.map((dossier) => (
                <tr
                  key={dossier.id}
                  tabIndex={onEdit ? 0 : undefined}
                  onClick={onEdit ? () => onEdit(dossier.id) : undefined}
                  onKeyDown={
                    onEdit
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onEdit(dossier.id);
                          }
                        }
                      : undefined
                  }
                  className={`border-b border-dba-border last:border-b-0 hover:bg-[#fbfcfb] ${
                    onEdit
                      ? "cursor-pointer focus-visible:bg-[#f5f7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dba-green"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3.5 font-medium whitespace-nowrap text-dba-charcoal">
                    {dossier.clientName}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal">
                    {displayText(dossier.advisor)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal">
                    {displayText(dossier.lender)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium whitespace-nowrap tabular-nums text-dba-charcoal">
                    {formatCurrency(dossier.principal)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-dba-charcoal">
                    {formatDateNl(dossier.applicationDate)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-dba-charcoal">
                    {formatDateNl(dossier.conditionalDate)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-dba-charcoal">
                    {formatDateNl(dossier.closingDate)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <PhaseSelect
                      dossierId={dossier.id}
                      phaseLabel={dossier.phase}
                      onPhaseChange={onPhaseChange}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit?.(dossier.id);
                      }}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-dba-muted transition-colors hover:bg-dba-background hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
                      aria-label={`Bewerken: ${dossier.clientName}`}
                    >
                      <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                      <span className="sr-only sm:not-sr-only">Bewerken</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dba-border px-4 py-3">
        <p className="text-[13px] text-dba-muted">
          {total === 0
            ? "0 dossiers"
            : total <= 10
              ? `1 - ${total} van ${total} dossiers`
              : `${total} dossiers`}
        </p>
      </div>
    </section>
  );
}
