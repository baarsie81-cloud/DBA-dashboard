import { asc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { advisors } from "@/db/schema";

export type AdvisorOption = {
  id: string;
  name: string;
  active: boolean;
};

/** Active advisors, optionally including one selected (possibly inactive) advisor. */
export async function getAdvisorOptions(
  includeId?: string | null,
): Promise<AdvisorOption[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: advisors.id,
      name: advisors.name,
      active: advisors.active,
    })
    .from(advisors)
    .where(
      includeId
        ? or(eq(advisors.active, true), eq(advisors.id, includeId))
        : eq(advisors.active, true),
    )
    .orderBy(asc(advisors.name));

  return rows;
}

export async function getActiveAdvisors(): Promise<AdvisorOption[]> {
  return getAdvisorOptions(null);
}
