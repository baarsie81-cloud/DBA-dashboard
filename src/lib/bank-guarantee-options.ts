import { normalizeLookupKey } from "@/lib/excel-import/normalize";

/**
 * Canonical values stored in mortgage_cases.bank_guarantee (text).
 * UI is type (BG/WB) + settled checkbox; these labels remain the DB format.
 */
export const BANK_GUARANTEE_OPTIONS = [
  "In afwachting van bankgarantie",
  "In afwachting van waarborgsom",
  "Bankgarantie geregeld",
  "Waarborgsom geregeld",
] as const;

export type BankGuaranteeOption = (typeof BANK_GUARANTEE_OPTIONS)[number];
export type BankGuaranteeType = "BG" | "WB";

export type BankGuaranteeUiState = {
  type: BankGuaranteeType | null;
  settled: boolean;
  /** Non-null when the stored text is not a known/unambiguous BG/WB value. */
  legacy: string | null;
};

const KNOWN = new Set<string>(BANK_GUARANTEE_OPTIONS);

/** Exact / unambiguous aliases → standard stored label. */
const VALUE_ALIASES: Record<string, BankGuaranteeOption> = {
  [normalizeLookupKey("In afwachting van bankgarantie")]:
    "In afwachting van bankgarantie",
  [normalizeLookupKey("In afwachting van waarborgsom")]:
    "In afwachting van waarborgsom",
  [normalizeLookupKey("Bankgarantie geregeld")]: "Bankgarantie geregeld",
  [normalizeLookupKey("Waarborgsom geregeld")]: "Waarborgsom geregeld",
  // Compact production / Excel variants with clear type (+ optional settled).
  [normalizeLookupKey("BG")]: "In afwachting van bankgarantie",
  [normalizeLookupKey("Bankgarantie")]: "In afwachting van bankgarantie",
  [normalizeLookupKey("BG gesteld")]: "Bankgarantie geregeld",
  [normalizeLookupKey("WB")]: "In afwachting van waarborgsom",
  [normalizeLookupKey("WBS")]: "In afwachting van waarborgsom",
  [normalizeLookupKey("Waarborgsom")]: "In afwachting van waarborgsom",
  [normalizeLookupKey("WB gesteld")]: "Waarborgsom geregeld",
  [normalizeLookupKey("WBS gesteld")]: "Waarborgsom geregeld",
};

export function isKnownBankGuarantee(
  value: string,
): value is BankGuaranteeOption {
  return KNOWN.has(value);
}

export function resolveCanonicalBankGuarantee(
  raw: string | null | undefined,
): BankGuaranteeOption | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isKnownBankGuarantee(trimmed)) return trimmed;
  return VALUE_ALIASES[normalizeLookupKey(trimmed)] ?? null;
}

export function composeBankGuarantee(
  type: BankGuaranteeType | null,
  settled: boolean,
): BankGuaranteeOption | null {
  if (type === "BG") {
    return settled
      ? "Bankgarantie geregeld"
      : "In afwachting van bankgarantie";
  }
  if (type === "WB") {
    return settled
      ? "Waarborgsom geregeld"
      : "In afwachting van waarborgsom";
  }
  return null;
}

export function parseBankGuaranteeUi(
  raw: string | null | undefined,
): BankGuaranteeUiState {
  if (raw == null || raw.trim() === "") {
    return { type: null, settled: false, legacy: null };
  }

  const canonical = resolveCanonicalBankGuarantee(raw);
  if (canonical == null) {
    return { type: null, settled: false, legacy: raw.trim() };
  }

  switch (canonical) {
    case "In afwachting van bankgarantie":
      return { type: "BG", settled: false, legacy: null };
    case "Bankgarantie geregeld":
      return { type: "BG", settled: true, legacy: null };
    case "In afwachting van waarborgsom":
      return { type: "WB", settled: false, legacy: null };
    case "Waarborgsom geregeld":
      return { type: "WB", settled: true, legacy: null };
    default:
      return { type: null, settled: false, legacy: raw.trim() };
  }
}

/**
 * Build the stored bank_guarantee value from form fields.
 * - If the user picked BG/WB → compose canonical label.
 * - Else if a legacy value was present → keep it unchanged.
 * - Else → null.
 */
export function bankGuaranteeFromFormFields(input: {
  typeRaw: string | null;
  settled: boolean;
  legacyRaw: string | null;
}): { ok: true; value: string | null } | { ok: false; error: string } {
  const typeRaw = input.typeRaw?.trim() ?? "";
  if (typeRaw === "BG" || typeRaw === "WB") {
    return { ok: true, value: composeBankGuarantee(typeRaw, input.settled) };
  }
  if (typeRaw !== "" && typeRaw !== "—") {
    return { ok: false, error: "Kies BG of WB." };
  }

  const legacy = input.legacyRaw?.trim() || null;
  if (legacy) {
    return { ok: true, value: legacy };
  }

  return { ok: true, value: null };
}

/** Compact table display: "BG ☐" / "BG ☑" / "WB ☐" / "WB ☑", else original/—. */
export function formatBankGuaranteeCompact(
  raw: string | null | undefined,
): string {
  const parsed = parseBankGuaranteeUi(raw);
  if (parsed.type) {
    return `${parsed.type} ${parsed.settled ? "☑" : "☐"}`;
  }
  if (parsed.legacy) return parsed.legacy;
  return "—";
}

/**
 * Normalize Excel BG/WBS only when the mapping is unambiguous.
 * Otherwise keep the historical text as-is.
 */
export function normalizeBankGuaranteeFromExcel(
  raw: string | null,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return resolveCanonicalBankGuarantee(trimmed) ?? trimmed;
}

export function isAllowedBankGuaranteeValue(value: string | null): boolean {
  if (value == null) return true;
  return value.length > 0;
}

/** @deprecated Prefer BG/WB + checkbox UI; kept for any leftover callers. */
export function bankGuaranteeSelectOptions(
  current: string | null | undefined,
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> =
    BANK_GUARANTEE_OPTIONS.map((value) => ({
      value,
      label: value,
    }));

  if (current && !KNOWN.has(current) && !resolveCanonicalBankGuarantee(current)) {
    options.unshift({
      value: current,
      label: `${current} (bestaand)`,
    });
  }

  return options;
}
