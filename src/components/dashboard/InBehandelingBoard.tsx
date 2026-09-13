"use client";

import { Suspense, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdvisorOption } from "@/db/queries/advisors";
import type { LenderOption } from "@/db/queries/lenders";
import type { MortgageCaseDetail } from "@/db/queries/mortgage-cases";
import type { MortgagePhase as DbMortgagePhase } from "@/db/schema";
import type { MortgageDossier } from "@/lib/types";
import {
  loadDossierFormAction,
  updateMortgageCasePhaseAction,
} from "@/lib/mortgage-actions";
import { DossierPanel } from "./DossierPanel";
import { FilterBar } from "./FilterBar";
import { MortgageTable } from "./MortgageTable";

type InBehandelingBoardProps = {
  dossiers: MortgageDossier[];
  filterAdvisors: AdvisorOption[];
  filterLenders: LenderOption[];
  activeAdvisors: AdvisorOption[];
  activeLenders: LenderOption[];
  hasActiveFilters: boolean;
  defaultPhase?: DbMortgagePhase;
};

type PanelState =
  | { open: false }
  | {
      open: true;
      mode: "create" | "edit";
      advisors: AdvisorOption[];
      lenders: LenderOption[];
      initial: MortgageCaseDetail | null;
    };

function FilterBarFallback() {
  return (
    <div className="h-[62px] animate-pulse rounded-xl border border-dba-border bg-dba-surface" />
  );
}

export function InBehandelingBoard({
  dossiers,
  filterAdvisors,
  filterLenders,
  activeAdvisors,
  activeLenders,
  hasActiveFilters,
  defaultPhase = "in_behandeling",
}: InBehandelingBoardProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<PanelState>({ open: false });
  const [, startTransition] = useTransition();
  const [phaseError, setPhaseError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const closePanel = useCallback(() => {
    setPanel({ open: false });
  }, []);

  const handleSaved = useCallback(() => {
    setPanel({ open: false });
    refresh();
  }, [refresh]);

  const openCreate = useCallback(() => {
    setPanel({
      open: true,
      mode: "create",
      advisors: activeAdvisors,
      lenders: activeLenders,
      initial: null,
    });
  }, [activeAdvisors, activeLenders]);

  const openEdit = useCallback(async (id: string) => {
    const loaded = await loadDossierFormAction(id);
    if (!loaded) return;
    setPanel({
      open: true,
      mode: "edit",
      advisors: loaded.advisors,
      lenders: loaded.lenders,
      initial: loaded.detail,
    });
  }, []);

  const handlePhaseChange = useCallback(
    async (id: string, phase: DbMortgagePhase) => {
      setPhaseError(null);
      const result = await updateMortgageCasePhaseAction(id, phase);
      if (!result.ok) {
        setPhaseError(
          result.error ?? "Fase wijzigen is niet gelukt. Probeer het opnieuw.",
        );
        refresh();
        return;
      }
      refresh();
    },
    [refresh],
  );

  return (
    <>
      <Suspense fallback={<FilterBarFallback />}>
        <FilterBar
          advisors={filterAdvisors}
          lenders={filterLenders}
          onAdd={openCreate}
        />
      </Suspense>

      {phaseError ? (
        <p role="alert" className="text-[13px] text-red-700">
          {phaseError}
        </p>
      ) : null}

      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-xl border border-dba-border bg-dba-surface" />
        }
      >
        <MortgageTable
          dossiers={dossiers}
          hasActiveFilters={hasActiveFilters}
          onEdit={openEdit}
          onPhaseChange={handlePhaseChange}
        />
      </Suspense>

      <DossierPanel
        open={panel.open}
        mode={panel.open ? panel.mode : "create"}
        defaultPhase={defaultPhase}
        advisors={panel.open ? panel.advisors : activeAdvisors}
        lenders={panel.open ? panel.lenders : activeLenders}
        initial={panel.open ? panel.initial : null}
        onClose={closePanel}
        onSaved={handleSaved}
      />
    </>
  );
}
