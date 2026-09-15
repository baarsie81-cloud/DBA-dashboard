import type { MortgagePhase as DbMortgagePhase } from "@/db/schema";
import type { MortgageCaseWriteInput } from "@/db/queries/mortgage-cases";
import {
  buildLegacyCustomerNameFromKlant1,
  cleanNamePart,
} from "@/lib/customer-name";
import { isDossierYear } from "@/lib/dossier-year";
import { isAllowedBankGuaranteeValue } from "@/lib/bank-guarantee-options";
import { parseFeeProcessingMonthInput } from "@/lib/fee-processing-month";
import { isAllowedMortgageTypeValue } from "@/lib/mortgage-type-options";

export const PHASE_OPTIONS: { value: DbMortgagePhase; label: string }[] = [
  { value: "prospect", label: "Prospect" },
  { value: "in_behandeling", label: "In behandeling" },
  { value: "geannuleerd", label: "Geannuleerd" },
  { value: "afgehandeld", label: "Afgehandeld" },
];

const PHASE_VALUES = new Set(PHASE_OPTIONS.map((option) => option.value));

export function isMortgagePhase(value: string): value is DbMortgagePhase {
  return PHASE_VALUES.has(value as DbMortgagePhase);
}

export type ParsedMortgageForm =
  | { ok: true; data: MortgageCaseWriteInput }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

/** Parse amount input to a numeric string with 2 decimals, or null. */
export function parseAmountInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false } {
  if (raw == null || raw.trim() === "") return { ok: true, value: null };

  let normalized = raw.trim().replace(/\s/g, "");

  if (normalized.includes(".") && normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false };
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return { ok: false };

  return { ok: true, value: amount.toFixed(2) };
}

function parseDateInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false } {
  if (raw == null || raw.trim() === "") return { ok: true, value: null };
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false };
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, value };
}

export function parseMortgageFormData(formData: FormData): ParsedMortgageForm {
  const customer1LastName = cleanNamePart(
    String(formData.get("customer1LastName") ?? ""),
  );
  if (!customer1LastName) {
    return {
      ok: false,
      error: "Achternaam van klant 1 is verplicht.",
      fieldErrors: { customer1LastName: "Achternaam is verplicht." },
    };
  }

  const customer1Initials = cleanNamePart(
    String(formData.get("customer1Initials") ?? ""),
  );
  const customer2LastName = cleanNamePart(
    String(formData.get("customer2LastName") ?? ""),
  );
  const customer2Initials = cleanNamePart(
    String(formData.get("customer2Initials") ?? ""),
  );

  const customerName = buildLegacyCustomerNameFromKlant1(
    customer1LastName,
    customer1Initials,
  );

  const phaseRaw = String(formData.get("phase") ?? "").trim();
  if (!PHASE_VALUES.has(phaseRaw as DbMortgagePhase)) {
    return { ok: false, error: "Kies een geldige fase." };
  }

  const svn = formData.get("svn") != null;
  const readyForPassing = formData.get("readyForPassing") != null;

  const dossierYearRaw = emptyToNull(formData.get("dossierYear"));
  let dossierYear: number | null = null;
  if (dossierYearRaw != null) {
    const year = Number(dossierYearRaw);
    if (!Number.isInteger(year) || !isDossierYear(year)) {
      return {
        ok: false,
        error: "Kies een geldig dossierjaar.",
        fieldErrors: { dossierYear: "Kies een geldig dossierjaar." },
      };
    }
    dossierYear = year;
  }

  const principal = parseAmountInput(
    emptyToNull(formData.get("principalAmount")),
  );
  if (!principal.ok) {
    return {
      ok: false,
      error: "Hoofdsom is geen geldig bedrag.",
      fieldErrors: { principalAmount: "Voer een geldig bedrag in." },
    };
  }

  const fee = parseAmountInput(emptyToNull(formData.get("fee")));
  if (!fee.ok) {
    return {
      ok: false,
      error: "Tarief/vergoeding is geen geldig bedrag.",
      fieldErrors: { fee: "Voer een geldig bedrag in." },
    };
  }

  const dateFields = [
    "applicationDate",
    "financingConditionDate",
    "passingDate",
    "guaranteeDate",
    "mortgageConfirmationDate",
  ] as const;

  const dates: Record<(typeof dateFields)[number], string | null> = {
    applicationDate: null,
    financingConditionDate: null,
    passingDate: null,
    guaranteeDate: null,
    mortgageConfirmationDate: null,
  };

  for (const field of dateFields) {
    const parsed = parseDateInput(emptyToNull(formData.get(field)));
    if (!parsed.ok) {
      return {
        ok: false,
        error: "Een of meer datums zijn ongeldig.",
        fieldErrors: { [field]: "Ongeldige datum." },
      };
    }
    dates[field] = parsed.value;
  }

  const feeProcessing = parseFeeProcessingMonthInput(
    emptyToNull(formData.get("feeProcessingDate")),
  );
  if (!feeProcessing.ok) {
    return {
      ok: false,
      error: "Verwerking vergoeding is ongeldig.",
      fieldErrors: { feeProcessingDate: "Kies een geldige maand." },
    };
  }

  const mortgageType = emptyToNull(formData.get("mortgageType"));
  if (!isAllowedMortgageTypeValue(mortgageType)) {
    return {
      ok: false,
      error: "Soort hypotheek is ongeldig.",
      fieldErrors: { mortgageType: "Kies een geldige optie." },
    };
  }

  const bankGuarantee = emptyToNull(formData.get("bankGuarantee"));
  if (!isAllowedBankGuaranteeValue(bankGuarantee)) {
    return {
      ok: false,
      error: "BG / WBS is ongeldig.",
      fieldErrors: { bankGuarantee: "Kies een geldige optie." },
    };
  }

  const advisorIds = formData
    .getAll("advisorIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  return {
    ok: true,
    data: {
      customerName,
      customer1LastName,
      customer1Initials,
      customer2LastName,
      customer2Initials,
      advisorIds: Array.from(new Set(advisorIds)),
      mortgageType,
      applicationDate: dates.applicationDate,
      lenderId: emptyToNull(formData.get("lenderId")),
      principalAmount: principal.value,
      financingConditionDate: dates.financingConditionDate,
      bankGuarantee,
      guaranteeDate: dates.guaranteeDate,
      passingDate: dates.passingDate,
      mortgageConfirmationDate: dates.mortgageConfirmationDate,
      fee: fee.value,
      feeProcessingDate: feeProcessing.value,
      notes: emptyToNull(formData.get("notes")),
      svn,
      readyForPassing,
      dossierYear,
      phase: phaseRaw as DbMortgagePhase,
    },
  };
}

/** Format numeric DB string for form inputs. */
export function amountForInput(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return String(amount);
}

export function dateForInput(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : "";
}
