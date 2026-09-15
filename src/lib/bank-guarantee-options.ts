import { normalizeLookupKey } from "@/lib/excel-import/normalize";

/**
 * Standard BG/WBS choices. Stored as Dutch labels in bank_guarantee (text)
 * for simplicity and safe display without a mapping layer.
 */
export const BANK_GUARANTEE_OPTIONS = [
  "In afwachting van bankgarantie",
  "In afwachting van waarborgsom",
  "Bankgarantie geregeld",
  "Waarborgsom geregeld",
] as const;

export type BankGuaranteeOption = (typeof BANK_GUARANTEE_OPTIONS)[number];

const KNOWN = new Set<string>(BANK_GUARANTEE_OPTIONS);

/** Exact / unambiguous Excel aliases → standard label. */
const EXCEL_ALIASES: Record<string, BankGuaranteeOption> = {
  [normalizeLookupKey("In afwachting van bankgarantie")]:
    "In afwachting van bankgarantie",
  [normalizeLookupKey("In afwachting van waarborgsom")]:
    "In afwachting van waarborgsom",
  [normalizeLookupKey("Bankgarantie geregeld")]: "Bankgarantie geregeld",
  [normalizeLookupKey("Waarborgsom geregeld")]: "Waarborgsom geregeld",
};

export function isKnownBankGuarantee(
  value: string,
): value is BankGuaranteeOption {
  return KNOWN.has(value);
}

export function bankGuaranteeSelectOptions(
  current: string | null | undefined,
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> =
    BANK_GUARANTEE_OPTIONS.map((value) => ({
      value,
      label: value,
    }));

  if (current && !KNOWN.has(current)) {
    options.unshift({
      value: current,
      label: `${current} (bestaand)`,
    });
  }

  return options;
}

/**
 * Normalize Excel BG/WBS only when the mapping is unambiguous.
 * Otherwise keep the historical text as-is.
 */
export function normalizeBankGuaranteeFromExcel(
  raw: string | null,
): string | null {
  if (raw == null) return null;
  const mapped = EXCEL_ALIASES[normalizeLookupKey(raw)];
  return mapped ?? raw;
}

export function isAllowedBankGuaranteeValue(value: string | null): boolean {
  if (value == null) return true;
  return value.length > 0;
}
