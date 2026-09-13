"use server";

import { revalidatePath } from "next/cache";
import { MORTGAGE_VIEW_PATHS } from "@/lib/mortgage-phase-config";
import {
  createAdvisor,
  findAdvisorByName,
  getAdvisorById,
  updateAdvisor,
} from "@/db/queries/advisors";

export type AdvisorActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseAdvisorForm(formData: FormData): {
  ok: true;
  name: string;
  active: boolean;
} | {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
} {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return {
      ok: false,
      error: "Naam is verplicht.",
      fieldErrors: { name: "Naam is verplicht." },
    };
  }

  // checkbox present with value "true" when checked; absent when unchecked
  const active = formData.get("active") === "true";

  return { ok: true, name, active };
}

export async function createAdvisorAction(
  _prev: AdvisorActionState,
  formData: FormData,
): Promise<AdvisorActionState> {
  const parsed = parseAdvisorForm(formData);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const duplicate = await findAdvisorByName(parsed.name);
  if (duplicate) {
    return {
      ok: false,
      error: "Er bestaat al een adviseur met deze naam.",
      fieldErrors: { name: "Deze naam is al in gebruik." },
    };
  }

  try {
    await createAdvisor({ name: parsed.name, active: parsed.active });
    revalidatePath("/adviseurs");
    for (const path of MORTGAGE_VIEW_PATHS) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }
}

export async function updateAdvisorAction(
  _prev: AdvisorActionState,
  formData: FormData,
): Promise<AdvisorActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  const existing = await getAdvisorById(id);
  if (!existing) {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  const parsed = parseAdvisorForm(formData);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const duplicate = await findAdvisorByName(parsed.name, id);
  if (duplicate) {
    return {
      ok: false,
      error: "Er bestaat al een adviseur met deze naam.",
      fieldErrors: { name: "Deze naam is al in gebruik." },
    };
  }

  try {
    const updated = await updateAdvisor(id, {
      name: parsed.name,
      active: parsed.active,
    });
    if (!updated) {
      return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
    }
    revalidatePath("/adviseurs");
    for (const path of MORTGAGE_VIEW_PATHS) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }
}
