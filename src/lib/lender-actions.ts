"use server";

import { revalidatePath } from "next/cache";
import { MORTGAGE_VIEW_PATHS } from "@/lib/mortgage-phase-config";
import {
  createLender,
  deleteUnusedLender,
  findLenderByAlias,
  findLenderByName,
  getLenderById,
  LenderOperationError,
  mergeLenders,
  updateLender,
} from "@/db/queries/lenders";
import { requireSession } from "@/lib/auth/session";

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
  await requireSession();
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

  const aliasTarget = await findLenderByAlias(parsed.name);
  if (aliasTarget) {
    return {
      ok: false,
      error: `Deze naam is al als alias gekoppeld aan ${aliasTarget.name}.`,
      fieldErrors: { name: "Deze naam is al als alias in gebruik." },
    };
  }

  try {
    await createLender({ name: parsed.name, active: parsed.active });
    revalidatePath("/geldverstrekkers");
    for (const path of MORTGAGE_VIEW_PATHS) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }
}

export async function updateLenderAction(
  _prev: LenderActionState,
  formData: FormData,
): Promise<LenderActionState> {
  await requireSession();
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

  const aliasTarget = await findLenderByAlias(parsed.name);
  if (aliasTarget && aliasTarget.id !== id) {
    return {
      ok: false,
      error: `Deze naam is al als alias gekoppeld aan ${aliasTarget.name}.`,
      fieldErrors: { name: "Deze naam is al als alias in gebruik." },
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
    for (const path of MORTGAGE_VIEW_PATHS) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }
}

function revalidateLenderViews() {
  revalidatePath("/geldverstrekkers");
  for (const path of MORTGAGE_VIEW_PATHS) {
    revalidatePath(path);
  }
}

function lenderOperationMessage(error: unknown): string {
  if (!(error instanceof LenderOperationError)) {
    return "De actie is niet gelukt. Probeer het opnieuw.";
  }

  switch (error.code) {
    case "NOT_FOUND":
      return "Een van de geldverstrekkers bestaat niet meer. Ververs de pagina.";
    case "SAME_LENDER":
      return "Kies twee verschillende geldverstrekkers.";
    case "LENDER_IN_USE":
      return "Deze geldverstrekker is inmiddels aan een dossier gekoppeld en kan niet los worden verwijderd.";
  }
}

export async function mergeLenderAction(
  _prev: LenderActionState,
  formData: FormData,
): Promise<LenderActionState> {
  await requireSession();
  const sourceId = String(formData.get("sourceId") ?? "").trim();
  const targetId = String(formData.get("targetId") ?? "").trim();

  if (!sourceId || !targetId || sourceId === targetId) {
    return { ok: false, error: "Kies twee verschillende geldverstrekkers." };
  }

  try {
    await mergeLenders(sourceId, targetId);
    revalidateLenderViews();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: lenderOperationMessage(error) };
  }
}

export async function deleteUnusedLenderAction(
  _prev: LenderActionState,
  formData: FormData,
): Promise<LenderActionState> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Verwijderen is niet gelukt. Probeer het opnieuw." };
  }

  try {
    await deleteUnusedLender(id);
    revalidateLenderViews();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: lenderOperationMessage(error) };
  }
}
