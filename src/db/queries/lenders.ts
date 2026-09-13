import { asc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { lenders } from "@/db/schema";

export type LenderOption = {
  id: string;
  name: string;
  active: boolean;
};

/** Active lenders, optionally including one selected (possibly inactive) lender. */
export async function getLenderOptions(
  includeId?: string | null,
): Promise<LenderOption[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: lenders.id,
      name: lenders.name,
      active: lenders.active,
    })
    .from(lenders)
    .where(
      includeId
        ? or(eq(lenders.active, true), eq(lenders.id, includeId))
        : eq(lenders.active, true),
    )
    .orderBy(asc(lenders.name));

  return rows;
}

export async function getActiveLenders(): Promise<LenderOption[]> {
  return getLenderOptions(null);
}
