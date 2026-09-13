import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { advisors, lenders, mortgageCases } from "@/db/schema";
import type { MortgageCase, MortgagePhase as DbMortgagePhase } from "@/db/schema";

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

export type MortgageCaseDetail = {
  id: string;
  customerName: string;
  advisorId: string | null;
  mortgageType: string | null;
  applicationDate: string | Date | null;
  lenderId: string | null;
  principalAmount: string | null;
  lastCheckDate: string | Date | null;
  financingConditionDate: string | Date | null;
  bankGuarantee: string | null;
  passingDate: string | Date | null;
  mortgageConfirmation: string | null;
  fee: string | null;
  notes: string | null;
  phase: DbMortgagePhase;
};

export type MortgageCaseWriteInput = {
  customerName: string;
  advisorId: string | null;
  mortgageType: string | null;
  applicationDate: string | null;
  lenderId: string | null;
  principalAmount: string | null;
  lastCheckDate: string | null;
  financingConditionDate: string | null;
  bankGuarantee: string | null;
  passingDate: string | null;
  mortgageConfirmation: string | null;
  fee: string | null;
  notes: string | null;
  phase: DbMortgagePhase;
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

export async function getMortgageCaseById(
  id: string,
): Promise<MortgageCaseDetail | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: mortgageCases.id,
      customerName: mortgageCases.customerName,
      advisorId: mortgageCases.advisorId,
      mortgageType: mortgageCases.mortgageType,
      applicationDate: mortgageCases.applicationDate,
      lenderId: mortgageCases.lenderId,
      principalAmount: mortgageCases.principalAmount,
      lastCheckDate: mortgageCases.lastCheckDate,
      financingConditionDate: mortgageCases.financingConditionDate,
      bankGuarantee: mortgageCases.bankGuarantee,
      passingDate: mortgageCases.passingDate,
      mortgageConfirmation: mortgageCases.mortgageConfirmation,
      fee: mortgageCases.fee,
      notes: mortgageCases.notes,
      phase: mortgageCases.phase,
    })
    .from(mortgageCases)
    .where(eq(mortgageCases.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function createMortgageCase(
  input: MortgageCaseWriteInput,
): Promise<MortgageCase> {
  const db = getDb();
  const [created] = await db
    .insert(mortgageCases)
    .values({
      customerName: input.customerName,
      advisorId: input.advisorId,
      mortgageType: input.mortgageType,
      applicationDate: input.applicationDate,
      lenderId: input.lenderId,
      principalAmount: input.principalAmount,
      lastCheckDate: input.lastCheckDate,
      financingConditionDate: input.financingConditionDate,
      bankGuarantee: input.bankGuarantee,
      passingDate: input.passingDate,
      mortgageConfirmation: input.mortgageConfirmation,
      fee: input.fee,
      notes: input.notes,
      phase: input.phase,
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

export async function updateMortgageCase(
  id: string,
  input: MortgageCaseWriteInput,
): Promise<MortgageCase | null> {
  const db = getDb();
  const [updated] = await db
    .update(mortgageCases)
    .set({
      customerName: input.customerName,
      advisorId: input.advisorId,
      mortgageType: input.mortgageType,
      applicationDate: input.applicationDate,
      lenderId: input.lenderId,
      principalAmount: input.principalAmount,
      lastCheckDate: input.lastCheckDate,
      financingConditionDate: input.financingConditionDate,
      bankGuarantee: input.bankGuarantee,
      passingDate: input.passingDate,
      mortgageConfirmation: input.mortgageConfirmation,
      fee: input.fee,
      notes: input.notes,
      phase: input.phase,
      updatedAt: new Date(),
    })
    .where(eq(mortgageCases.id, id))
    .returning();

  return updated ?? null;
}
