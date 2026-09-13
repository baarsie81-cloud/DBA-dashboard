"use server";

import { revalidatePath } from "next/cache";
import { getAdvisorOptions } from "@/db/queries/advisors";
import { getLenderOptions } from "@/db/queries/lenders";
import {
  createMortgageCase,
  deleteMortgageCase,
  getMortgageCaseById,
  updateMortgageCase,
  updateMortgageCasePhase,
} from "@/db/queries/mortgage-cases";
import type { MortgagePhase as DbMortgagePhase } from "@/db/schema";
import {
  isMortgagePhase,
  parseMortgageFormData,
} from "@/lib/mortgage-validation";

export type MortgageActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createMortgageCaseAction(
  _prev: MortgageActionState,
  formData: FormData,
): Promise<MortgageActionState> {
  const parsed = parseMortgageFormData(formData);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  try {
    await createMortgageCase(parsed.data);
    revalidatePath("/in-behandeling");
    return { ok: true };
  } catch {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }
}

export async function updateMortgageCaseAction(
  _prev: MortgageActionState,
  formData: FormData,
): Promise<MortgageActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  const existing = await getMortgageCaseById(id);
  if (!existing) {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  const parsed = parseMortgageFormData(formData);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  try {
    const updated = await updateMortgageCase(id, parsed.data);
    if (!updated) {
      return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
    }
    revalidatePath("/in-behandeling");
    return { ok: true };
  } catch {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }
}

export async function loadMortgageCaseAction(id: string) {
  return getMortgageCaseById(id);
}

/** Load a case for editing, including inactive advisor/lender if currently linked. */
export async function loadDossierFormAction(id: string) {
  const detail = await getMortgageCaseById(id);
  if (!detail) return null;

  const [advisors, lenders] = await Promise.all([
    getAdvisorOptions(detail.advisorId),
    getLenderOptions(detail.lenderId),
  ]);

  return { detail, advisors, lenders };
}

export async function deleteMortgageCaseAction(
  id: string,
): Promise<MortgageActionState> {
  if (!id.trim()) {
    return {
      ok: false,
      error: "Verwijderen is niet gelukt. Probeer het opnieuw.",
    };
  }

  try {
    const deleted = await deleteMortgageCase(id);
    if (!deleted) {
      return {
        ok: false,
        error: "Verwijderen is niet gelukt. Probeer het opnieuw.",
      };
    }
    revalidatePath("/in-behandeling");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Verwijderen is niet gelukt. Probeer het opnieuw.",
    };
  }
}

export async function updateMortgageCasePhaseAction(
  id: string,
  phase: string,
): Promise<MortgageActionState> {
  if (!id.trim() || !isMortgagePhase(phase)) {
    return { ok: false, error: "Fase wijzigen is niet gelukt. Probeer het opnieuw." };
  }

  try {
    const updated = await updateMortgageCasePhase(
      id,
      phase as DbMortgagePhase,
    );
    if (!updated) {
      return {
        ok: false,
        error: "Fase wijzigen is niet gelukt. Probeer het opnieuw.",
      };
    }
    revalidatePath("/in-behandeling");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Fase wijzigen is niet gelukt. Probeer het opnieuw.",
    };
  }
}
