import { and, eq, gte, ilike, lte, sql, type SQL } from "drizzle-orm";
import type {
  MortgageDeadlineFilter,
  MortgageListFilters,
  MortgageSortDirection,
  MortgageSortField,
} from "@/lib/mortgage-list-params";
import { addDaysIso, todayIsoAmsterdam } from "@/lib/dates";
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

function buildOrderBy(
  sort: MortgageSortField,
  direction: MortgageSortDirection,
): SQL {
  const dir = direction === "desc" ? "DESC" : "ASC";

  switch (sort) {
    case "customer_name":
      return sql`${mortgageCases.customerName} ${sql.raw(dir)} NULLS LAST`;
    case "advisor":
      return sql`${advisors.name} ${sql.raw(dir)} NULLS LAST`;
    case "lender":
      return sql`${lenders.name} ${sql.raw(dir)} NULLS LAST`;
    case "principal":
      return sql`${mortgageCases.principalAmount} ${sql.raw(dir)} NULLS LAST`;
    case "financing_condition_date":
      return sql`${mortgageCases.financingConditionDate} ${sql.raw(dir)} NULLS LAST`;
    case "passing_date":
    default:
      return sql`${mortgageCases.passingDate} ${sql.raw(dir)} NULLS LAST`;
  }
}

function buildPhaseFilters(
  phase: DbMortgagePhase,
  filters?: Partial<MortgageListFilters>,
): SQL {
  const clauses: SQL[] = [eq(mortgageCases.phase, phase)];

  const search = filters?.search?.trim();
  if (search) {
    clauses.push(ilike(mortgageCases.customerName, `%${search}%`));
  }

  if (filters?.advisorId) {
    clauses.push(eq(mortgageCases.advisorId, filters.advisorId));
  }

  if (filters?.lenderId) {
    clauses.push(eq(mortgageCases.lenderId, filters.lenderId));
  }

  const deadline = filters?.deadline as MortgageDeadlineFilter | null | undefined;
  if (deadline === "passing_14" || deadline === "conditions_14") {
    const today = todayIsoAmsterdam();
    const until = addDaysIso(today, 14);
    const dateColumn =
      deadline === "passing_14"
        ? mortgageCases.passingDate
        : mortgageCases.financingConditionDate;
    clauses.push(gte(dateColumn, today));
    clauses.push(lte(dateColumn, until));
  }

  return and(...clauses)!;
}

/** Fetch mortgage cases for a phase with advisor/lender names (left joins). */
export async function getMortgageCasesByPhase(
  phase: DbMortgagePhase,
  filters?: Partial<MortgageListFilters>,
): Promise<MortgageCaseRow[]> {
  const db = getDb();
  const sort = filters?.sort ?? "passing_date";
  const direction = filters?.direction ?? "asc";

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
    .where(buildPhaseFilters(phase, filters))
    .orderBy(buildOrderBy(sort, direction));
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

export async function updateMortgageCasePhase(
  id: string,
  phase: DbMortgagePhase,
): Promise<MortgageCase | null> {
  const db = getDb();
  const [updated] = await db
    .update(mortgageCases)
    .set({
      phase,
      updatedAt: new Date(),
    })
    .where(eq(mortgageCases.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteMortgageCase(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(mortgageCases)
    .where(eq(mortgageCases.id, id))
    .returning({ id: mortgageCases.id });

  return deleted.length > 0;
}
