import { collapseWhitespace } from "@/lib/excel-import/normalize";
import { parseLegacyCustomerName } from "@/lib/parse-legacy-customer-name";

/**
 * Clean a free-text name part for storage.
 * Collapses whitespace; rejects empty / "undefined" / "null".
 */
export function cleanNamePart(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const text = collapseWhitespace(String(raw));
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower === "undefined" || lower === "null") return null;
  return text;
}

/**
 * Display / legacy customer_name from Klant 1 only.
 * "Jansen, P." or "Jansen" when initials are absent.
 */
export function formatPersonDisplayName(
  lastName: string | null | undefined,
  initials: string | null | undefined,
): string | null {
  const family = cleanNamePart(lastName);
  if (!family) return null;
  const letters = cleanNamePart(initials);
  if (!letters) return family;
  return `${family}, ${letters}`;
}

/** Build legacy customer_name from Klant 1 (never includes Klant 2). */
export function buildLegacyCustomerNameFromKlant1(
  lastName: string | null | undefined,
  initials: string | null | undefined,
): string {
  return formatPersonDisplayName(lastName, initials) ?? "";
}

/**
 * Combine Excel Achternaam + Tussenvoegsels into customer_1_last_name.
 * Example: infix "de" + last "Vries" → "de Vries"
 */
export function combineExcelLastName(
  lastName: string | null,
  infix: string | null,
): string | null {
  const family = collapseWhitespace(
    [cleanNamePart(infix), cleanNamePart(lastName)].filter(Boolean).join(" "),
  );
  return family || null;
}

export type CustomerNameLines = {
  primary: string;
  secondary: string | null;
};

/**
 * Table/UI lines: Klant 1 primary, optional Klant 2 secondary.
 * Falls back to legacy customer_name when Klant 1 is empty.
 */
export function resolveCustomerNameLines(input: {
  customer1LastName: string | null | undefined;
  customer1Initials: string | null | undefined;
  customer2LastName: string | null | undefined;
  customer2Initials: string | null | undefined;
  customerName: string | null | undefined;
}): CustomerNameLines {
  const primary =
    formatPersonDisplayName(input.customer1LastName, input.customer1Initials) ??
    cleanNamePart(input.customerName) ??
    "Onbekend";

  const secondary = formatPersonDisplayName(
    input.customer2LastName,
    input.customer2Initials,
  );

  return { primary, secondary };
}

/**
 * Form defaults for Klant 1 when structured fields may still be empty.
 * Prefer stored Klant 1; else reliable legacy parse; else whole customer_name
 * in the last-name field so the dossier stays editable/readable.
 */
export function resolveKlant1FormDefaults(input: {
  customer1LastName: string | null | undefined;
  customer1Initials: string | null | undefined;
  customerName: string | null | undefined;
}): { lastName: string; initials: string } {
  if (cleanNamePart(input.customer1LastName)) {
    return {
      lastName: cleanNamePart(input.customer1LastName)!,
      initials: cleanNamePart(input.customer1Initials) ?? "",
    };
  }

  const parsed = parseLegacyCustomerName(input.customerName);
  if (parsed.fullyParsed && parsed.customer1LastName) {
    return {
      lastName: parsed.customer1LastName,
      initials: parsed.customer1Initials ?? "",
    };
  }

  return {
    lastName: cleanNamePart(input.customerName) ?? "",
    initials: "",
  };
}
