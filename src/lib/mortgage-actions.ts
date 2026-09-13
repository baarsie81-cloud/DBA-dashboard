"use server";

import { revalidatePath } from "next/cache";
import { getAdvisorOptions } from "@/db/queries/advisors";
import { getLenderOptions } from "@/db/queries/lenders";
import {
  createMortgageCase,
  getMortgageCaseById,
  updateMortgageCase,
} from "@/db/queries/mortgage-cases";
import { parseMortgageFormData } from "@/lib/mortgage-validation";

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
