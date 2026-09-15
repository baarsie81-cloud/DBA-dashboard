/**
 * Deterministic parser for existing DBA customer_name values.
 *
 * Expected legacy format (Excel / dashboard display):
 *   "[tussenvoegsel] achternaam, voorletter(s)"
 * Examples: "Jansen, P.", "De Vries, M.", "Van den Berg, J.P.", "Achterberg, A"
 *
 * Conservative: only accept initials that look like letter+dot sequences.
 * Do not guess partners, free-text labels, or inverted names.
 */

export type LegacyCustomerNameParse = {
  customer1LastName: string | null;
  customer1Initials: string | null;
  /** True only when both last name and initials were confidently extracted. */
  fullyParsed: boolean;
};

const INITIALS_PATTERN = /^[A-Za-zÀ-ÿ](?:\.\s*[A-Za-zÀ-ÿ])*\.?$/;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Parse a legacy customer_name into Klant 1 fields.
 * Never invents data: unclear values leave fields null.
 */
export function parseLegacyCustomerName(
  customerName: string | null | undefined,
): LegacyCustomerNameParse {
  const empty: LegacyCustomerNameParse = {
    customer1LastName: null,
    customer1Initials: null,
    fullyParsed: false,
  };

  if (customerName == null) return empty;
  const raw = collapseWhitespace(customerName);
  if (!raw) return empty;

  const commaIndex = raw.indexOf(",");
  if (commaIndex < 0) {
    return empty;
  }

  const lastName = collapseWhitespace(raw.slice(0, commaIndex));
  const initials = collapseWhitespace(raw.slice(commaIndex + 1));

  if (!lastName || !initials) {
    return empty;
  }

  // Reject double commas / leftover punctuation in the initials side.
  if (initials.includes(",") || !INITIALS_PATTERN.test(initials)) {
    return empty;
  }

  // Normalize spaced initials like "J. P." → keep collapsed form "J. P."
  // but ensure pattern already matched; store collapsed whitespace.
  return {
    customer1LastName: lastName,
    customer1Initials: initials,
    fullyParsed: true,
  };
}
