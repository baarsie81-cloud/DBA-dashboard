"use client";

import { useCallback, useState, useTransition } from "react";
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
  activeAdvisors: AdvisorOption[];
  activeLenders: LenderOption[];
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

export function InBehandelingBoard({
  dossiers,
  activeAdvisors,
  activeLenders,
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
      <FilterBar onAdd={openCreate} />

      {phaseError ? (
        <p role="alert" className="text-[13px] text-red-700">
          {phaseError}
        </p>
      ) : null}

      <MortgageTable
        dossiers={dossiers}
        onEdit={openEdit}
        onPhaseChange={handlePhaseChange}
      />

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
