import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { advisors, lenders, mortgageCases } from "@/db/schema";
import type { MortgagePhase as DbMortgagePhase } from "@/db/schema";

export type MortgageCaseRow = {
  id: string;
  customerName: string;
  principalAmount: string | null;
  applicationDate: string | Date | null;
  financingConditionDate: string | Date | null;
  passingDate: string | Date | null;
  phase: DbMortgagePhase;
  advisorName: string | null;
  lenderName: string | null;
};

/** Fetch mortgage cases for a phase with advisor/lender names (left joins). */
export async function getMortgageCasesByPhase(
  phase: DbMortgagePhase,
): Promise<MortgageCaseRow[]> {
  const db = getDb();

  return db
    .select({
      id: mortgageCases.id,
      customerName: mortgageCases.customerName,
      principalAmount: mortgageCases.principalAmount,
      applicationDate: mortgageCases.applicationDate,
      financingConditionDate: mortgageCases.financingConditionDate,
      passingDate: mortgageCases.passingDate,
      phase: mortgageCases.phase,
      advisorName: advisors.name,
      lenderName: lenders.name,
    })
    .from(mortgageCases)
    .leftJoin(advisors, eq(mortgageCases.advisorId, advisors.id))
    .leftJoin(lenders, eq(mortgageCases.lenderId, lenders.id))
    .where(eq(mortgageCases.phase, phase))
    .orderBy(sql`${mortgageCases.passingDate} ASC NULLS LAST`);
}
