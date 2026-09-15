import { and, eq, gte, ilike, isNull, lt, lte, sql, type SQL } from "drizzle-orm";
import type {
  MortgageDeadlineFilter,
  MortgageListFilters,
  MortgageSortDirection,
  MortgageSortField,
} from "@/lib/mortgage-list-params";
import { addDaysIso, todayIsoAmsterdam } from "@/lib/dates";
import { getDb } from "@/db";
import {
  advisors,
  lenders,
  mortgageCaseAdvisors,
  mortgageCases,
} from "@/db/schema";
import type { MortgageCase, MortgagePhase as DbMortgagePhase } from "@/db/schema";

export type MortgageCaseRow = {
  id: string;
  customerName: string;
  principalAmount: string | null;
  applicationDate: string | Date | null;
  financingConditionDate: string | Date | null;
  passingDate: string | Date | null;
  offerExpiryDate: string | Date | null;
  feeProcessingDate: string | Date | null;
  phase: DbMortgagePhase;
  advisorName: string | null;
  lenderName: string | null;
};

export type MortgageCaseDetail = {
  id: string;
  customerName: string;
  customer1LastName: string | null;
  customer1Initials: string | null;
  customer2LastName: string | null;
  customer2Initials: string | null;
  advisorIds: string[];
  mortgageType: string | null;
  applicationDate: string | Date | null;
  lenderId: string | null;
  principalAmount: string | null;
  lastCheckDate: string | Date | null;
  financingConditionDate: string | Date | null;
  bankGuarantee: string | null;
  guaranteeDate: string | Date | null;
  passingDate: string | Date | null;
  offerExpiryDate: string | Date | null;
  mortgageConfirmationDate: string | Date | null;
  fee: string | null;
  feeProcessingDate: string | Date | null;
  notes: string | null;
  phase: DbMortgagePhase;
};

export type MortgageCaseWriteInput = {
  customerName: string;
  advisorIds: string[];
  mortgageType: string | null;
  applicationDate: string | null;
  lenderId: string | null;
  principalAmount: string | null;
  lastCheckDate: string | null;
  financingConditionDate: string | null;
  bankGuarantee: string | null;
  guaranteeDate: string | null;
  passingDate: string | null;
  offerExpiryDate: string | null;
  mortgageConfirmationDate: string | null;
  fee: string | null;
  feeProcessingDate: string | null;
  notes: string | null;
  phase: DbMortgagePhase;
};

/** Aggregated advisor names, alphabetically joined with ", ". */
const advisorNamesSql = sql<string | null>`(
  SELECT string_agg(a.name, ', ' ORDER BY a.name)
  FROM ${mortgageCaseAdvisors} mca
  INNER JOIN ${advisors} a ON a.id = mca.advisor_id
  WHERE mca.mortgage_case_id = ${mortgageCases.id}
)`;

/**
 * First advisor name alphabetically among linked advisors.
 * Used so advisor column sorting stays predictable with multiple advisors.
 */
const firstAdvisorNameSql = sql`(
  SELECT MIN(a.name)
  FROM ${mortgageCaseAdvisors} mca
  INNER JOIN ${advisors} a ON a.id = mca.advisor_id
  WHERE mca.mortgage_case_id = ${mortgageCases.id}
)`;

function buildOrderBy(
  sort: MortgageSortField,
  direction: MortgageSortDirection,
): SQL {
  const dir = direction === "desc" ? "DESC" : "ASC";

  switch (sort) {
    case "customer_name":
      return sql`${mortgageCases.customerName} ${sql.raw(dir)} NULLS LAST`;
    case "advisor":
      return sql`${firstAdvisorNameSql} ${sql.raw(dir)} NULLS LAST`;
    case "lender":
      return sql`${lenders.name} ${sql.raw(dir)} NULLS LAST`;
    case "principal":
      return sql`${mortgageCases.principalAmount} ${sql.raw(dir)} NULLS LAST`;
    case "application_date":
      return sql`${mortgageCases.applicationDate} ${sql.raw(dir)} NULLS LAST`;
    case "financing_condition_date":
      return sql`${mortgageCases.financingConditionDate} ${sql.raw(dir)} NULLS LAST`;
    case "offer_expiry_date":
      return sql`${mortgageCases.offerExpiryDate} ${sql.raw(dir)} NULLS LAST`;
    case "fee_processing_date":
      return sql`${mortgageCases.feeProcessingDate} ${sql.raw(dir)} NULLS LAST`;
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
    clauses.push(sql`EXISTS (
      SELECT 1
      FROM ${mortgageCaseAdvisors} mca
      WHERE mca.mortgage_case_id = ${mortgageCases.id}
        AND mca.advisor_id = ${filters.advisorId}
    )`);
  }

  if (filters?.lenderId) {
    clauses.push(eq(mortgageCases.lenderId, filters.lenderId));
  }

  const deadline = filters?.deadline as MortgageDeadlineFilter | null | undefined;
  if (deadline) {
    const today = todayIsoAmsterdam();

    if (
      deadline === "passing_14" ||
      deadline === "conditions_14" ||
      deadline === "offer_14"
    ) {
      const until = addDaysIso(today, 14);
      const dateColumn =
        deadline === "passing_14"
          ? mortgageCases.passingDate
          : deadline === "conditions_14"
            ? mortgageCases.financingConditionDate
            : mortgageCases.offerExpiryDate;
      clauses.push(gte(dateColumn, today));
      clauses.push(lte(dateColumn, until));
    } else if (deadline === "offer_expired") {
      clauses.push(lt(mortgageCases.offerExpiryDate, today));
    }
  }

  if (filters?.feeUnprocessed) {
    clauses.push(isNull(mortgageCases.feeProcessingDate));
  }

  return and(...clauses)!;
}

async function getAdvisorIdsForCase(caseId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ advisorId: mortgageCaseAdvisors.advisorId })
    .from(mortgageCaseAdvisors)
    .innerJoin(advisors, eq(mortgageCaseAdvisors.advisorId, advisors.id))
    .where(eq(mortgageCaseAdvisors.mortgageCaseId, caseId))
    .orderBy(advisors.name);

  return rows.map((row) => row.advisorId);
}

/** Fetch mortgage cases for a phase with aggregated advisor names (one row per case). */
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
      offerExpiryDate: mortgageCases.offerExpiryDate,
      feeProcessingDate: mortgageCases.feeProcessingDate,
      phase: mortgageCases.phase,
      advisorName: advisorNamesSql,
      lenderName: lenders.name,
    })
    .from(mortgageCases)
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
      customer1LastName: mortgageCases.customer1LastName,
      customer1Initials: mortgageCases.customer1Initials,
      customer2LastName: mortgageCases.customer2LastName,
      customer2Initials: mortgageCases.customer2Initials,
      mortgageType: mortgageCases.mortgageType,
      applicationDate: mortgageCases.applicationDate,
      lenderId: mortgageCases.lenderId,
      principalAmount: mortgageCases.principalAmount,
      lastCheckDate: mortgageCases.lastCheckDate,
      financingConditionDate: mortgageCases.financingConditionDate,
      bankGuarantee: mortgageCases.bankGuarantee,
      guaranteeDate: mortgageCases.guaranteeDate,
      passingDate: mortgageCases.passingDate,
      offerExpiryDate: mortgageCases.offerExpiryDate,
      mortgageConfirmationDate: mortgageCases.mortgageConfirmationDate,
      fee: mortgageCases.fee,
      feeProcessingDate: mortgageCases.feeProcessingDate,
      notes: mortgageCases.notes,
      phase: mortgageCases.phase,
    })
    .from(mortgageCases)
    .where(eq(mortgageCases.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    advisorIds: await getAdvisorIdsForCase(id),
  };
}

export async function createMortgageCase(
  input: MortgageCaseWriteInput,
): Promise<MortgageCase> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(mortgageCases)
      .values({
        customerName: input.customerName,
        mortgageType: input.mortgageType,
        applicationDate: input.applicationDate,
        lenderId: input.lenderId,
        principalAmount: input.principalAmount,
        lastCheckDate: input.lastCheckDate,
        financingConditionDate: input.financingConditionDate,
        bankGuarantee: input.bankGuarantee,
        guaranteeDate: input.guaranteeDate,
        passingDate: input.passingDate,
        offerExpiryDate: input.offerExpiryDate,
        mortgageConfirmationDate: input.mortgageConfirmationDate,
        fee: input.fee,
        feeProcessingDate: input.feeProcessingDate,
        notes: input.notes,
        phase: input.phase,
        updatedAt: new Date(),
      })
      .returning();

    const uniqueIds = Array.from(new Set(input.advisorIds.filter(Boolean)));
    if (uniqueIds.length > 0) {
      await tx.insert(mortgageCaseAdvisors).values(
        uniqueIds.map((advisorId) => ({
          mortgageCaseId: created.id,
          advisorId,
        })),
      );
    }

    return created;
  });
}

export async function updateMortgageCase(
  id: string,
  input: MortgageCaseWriteInput,
): Promise<MortgageCase | null> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(mortgageCases)
      .set({
        customerName: input.customerName,
        mortgageType: input.mortgageType,
        applicationDate: input.applicationDate,
        lenderId: input.lenderId,
        principalAmount: input.principalAmount,
        lastCheckDate: input.lastCheckDate,
        financingConditionDate: input.financingConditionDate,
        bankGuarantee: input.bankGuarantee,
        guaranteeDate: input.guaranteeDate,
        passingDate: input.passingDate,
        offerExpiryDate: input.offerExpiryDate,
        mortgageConfirmationDate: input.mortgageConfirmationDate,
        fee: input.fee,
        feeProcessingDate: input.feeProcessingDate,
        notes: input.notes,
        phase: input.phase,
        updatedAt: new Date(),
      })
      .where(eq(mortgageCases.id, id))
      .returning();

    if (!updated) return null;

    await tx
      .delete(mortgageCaseAdvisors)
      .where(eq(mortgageCaseAdvisors.mortgageCaseId, id));

    const uniqueIds = Array.from(new Set(input.advisorIds.filter(Boolean)));
    if (uniqueIds.length > 0) {
      await tx.insert(mortgageCaseAdvisors).values(
        uniqueIds.map((advisorId) => ({
          mortgageCaseId: id,
          advisorId,
        })),
      );
    }

    return updated;
  });
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
