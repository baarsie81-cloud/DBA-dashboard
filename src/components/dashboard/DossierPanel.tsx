"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { AdvisorOption } from "@/db/queries/advisors";
import type { LenderOption } from "@/db/queries/lenders";
import type { MortgageCaseDetail } from "@/db/queries/mortgage-cases";
import type { MortgagePhase as DbMortgagePhase } from "@/db/schema";
import { MortgageForm } from "./MortgageForm";

type DossierPanelProps = {
  open: boolean;
  mode: "create" | "edit";
  defaultPhase: DbMortgagePhase;
  advisors: AdvisorOption[];
  lenders: LenderOption[];
  initial?: MortgageCaseDetail | null;
  onClose: () => void;
  onSaved: () => void;
};

export function DossierPanel({
  open,
  mode,
  defaultPhase,
  advisors,
  lenders,
  initial,
  onClose,
  onSaved,
}: DossierPanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Sluiten"
        className="absolute inset-0 bg-dba-charcoal/30"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-panel-title"
        className="relative flex h-full w-full max-w-[580px] flex-col bg-dba-surface shadow-[-8px_0_24px_rgba(51,53,54,0.08)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-dba-border px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-dba-muted uppercase">
              Hypotheekdossier
            </p>
            <h2
              id="dossier-panel-title"
              className="mt-1 text-xl font-semibold tracking-tight text-dba-charcoal"
            >
              {mode === "create" ? "Dossier toevoegen" : "Dossier bewerken"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-dba-muted transition-colors hover:bg-dba-background hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <MortgageForm
            key={mode === "edit" ? (initial?.id ?? "edit") : "create"}
            mode={mode}
            defaultPhase={defaultPhase}
            advisors={advisors}
            lenders={lenders}
            initial={initial}
            onCancel={onClose}
            onSuccess={onSaved}
          />
        </div>
      </aside>
    </div>
  );
}
