import { MORTGAGE_TYPE_OPTIONS, isKnownMortgageType } from "./mortgage-type-options";

export const OTHER_MORTGAGE_CATEGORY = "Overig / niet ingedeeld";

export type MortgageDistributionInput = {
  mortgageType: string | null;
  lenderId: string | null;
  lenderName: string | null;
  count: number;
  principalTotal: number | null;
  missingPrincipalCount: number;
};

export type MortgageDistributionRow = {
  lenderId: string | null;
  lenderName: string;
  count: number;
  percentage: number;
  principalTotal: number | null;
  missingPrincipalCount: number;
};

export type MortgageDistributionCategory = {
  category: string;
  rows: MortgageDistributionRow[];
  count: number;
  principalTotal: number | null;
  missingPrincipalCount: number;
};

/** Exact stored choices only: never infer a category from historical free text. */
export function buildMortgageDistribution(
  inputs: MortgageDistributionInput[],
): MortgageDistributionCategory[] {
  return [...MORTGAGE_TYPE_OPTIONS, OTHER_MORTGAGE_CATEGORY].map((category) => {
    const lenders = new Map<string | null, MortgageDistributionRow>();
    for (const input of inputs) {
      const inputCategory = input.mortgageType != null && isKnownMortgageType(input.mortgageType)
        ? input.mortgageType
        : OTHER_MORTGAGE_CATEGORY;
      if (inputCategory !== category) continue;

      const row = lenders.get(input.lenderId) ?? {
        lenderId: input.lenderId,
        lenderName: input.lenderName?.trim() || "Niet ingevuld",
        count: 0,
        percentage: 0,
        principalTotal: null,
        missingPrincipalCount: 0,
      };
      row.count += input.count;
      row.missingPrincipalCount += input.missingPrincipalCount;
      if (input.principalTotal != null) {
        // Add integer cents, including when several historical types share a lender.
        row.principalTotal = (Math.round((row.principalTotal ?? 0) * 100)
          + Math.round(input.principalTotal * 100)) / 100;
      }
      lenders.set(input.lenderId, row);
    }

    const rows = [...lenders.values()].sort((a, b) =>
      b.count - a.count || a.lenderName.localeCompare(b.lenderName, "nl"),
    );
    const count = rows.reduce((sum, row) => sum + row.count, 0);
    let principalCents: number | null = null;
    for (const row of rows) {
      row.percentage = count === 0 ? 0 : row.count / count * 100;
      if (row.principalTotal != null) {
        principalCents = (principalCents ?? 0) + Math.round(row.principalTotal * 100);
      }
    }
    return {
      category,
      rows,
      count,
      principalTotal: principalCents == null ? null : principalCents / 100,
      missingPrincipalCount: rows.reduce((sum, row) => sum + row.missingPrincipalCount, 0),
    };
  });
}
