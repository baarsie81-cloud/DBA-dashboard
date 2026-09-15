/** Standard mortgage type choices for create/edit UI. */
export const MORTGAGE_TYPE_OPTIONS = [
  "Starter",
  "Doorstromer",
  "Ophoger",
  "Uit Elkaar Gaan",
  "Familie",
  "Zakelijk",
] as const;

export type MortgageTypeOption = (typeof MORTGAGE_TYPE_OPTIONS)[number];

const KNOWN = new Set<string>(MORTGAGE_TYPE_OPTIONS);

export function isKnownMortgageType(value: string): value is MortgageTypeOption {
  return KNOWN.has(value);
}

/**
 * Select options including a temporary legacy value when the stored
 * mortgage_type is not in the standard list.
 */
export function mortgageTypeSelectOptions(
  current: string | null | undefined,
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> =
    MORTGAGE_TYPE_OPTIONS.map((value) => ({
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
 * Accept empty, known options, or any existing free-text legacy value.
 * Form UI constrains new choices to the standard list.
 */
export function isAllowedMortgageTypeValue(value: string | null): boolean {
  if (value == null) return true;
  return value.length > 0;
}
