"use server";

import { revalidatePath } from "next/cache";
import {
  createLender,
  findLenderByName,
  getLenderById,
  updateLender,
} from "@/db/queries/lenders";

export type LenderActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseLenderForm(formData: FormData): {
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

export async function createLenderAction(
  _prev: LenderActionState,
  formData: FormData,
): Promise<LenderActionState> {
  const parsed = parseLenderForm(formData);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const duplicate = await findLenderByName(parsed.name);
  if (duplicate) {
    return {
      ok: false,
      error: "Er bestaat al een geldverstrekker met deze naam.",
      fieldErrors: { name: "Deze naam is al in gebruik." },
    };
  }

  try {
    await createLender({ name: parsed.name, active: parsed.active });
    revalidatePath("/geldverstrekkers");
    revalidatePath("/in-behandeling");
    return { ok: true };
  } catch {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }
}

export async function updateLenderAction(
  _prev: LenderActionState,
  formData: FormData,
): Promise<LenderActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  const existing = await getLenderById(id);
  if (!existing) {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  const parsed = parseLenderForm(formData);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const duplicate = await findLenderByName(parsed.name, id);
  if (duplicate) {
    return {
      ok: false,
      error: "Er bestaat al een geldverstrekker met deze naam.",
      fieldErrors: { name: "Deze naam is al in gebruik." },
    };
  }

  try {
    const updated = await updateLender(id, {
      name: parsed.name,
      active: parsed.active,
    });
    if (!updated) {
      return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
    }
    revalidatePath("/geldverstrekkers");
    revalidatePath("/in-behandeling");
    return { ok: true };
  } catch {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }
}
