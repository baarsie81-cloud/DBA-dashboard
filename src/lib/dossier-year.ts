/** Allowed administrative dossier years in the UI. */
export const DOSSIER_YEAR_OPTIONS = [2026, 2027, 2028, 2029, 2030] as const;
export type DossierYear = (typeof DOSSIER_YEAR_OPTIONS)[number];

export function isDossierYear(value: number): value is DossierYear {
  return (DOSSIER_YEAR_OPTIONS as readonly number[]).includes(value);
}
