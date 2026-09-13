import { and, eq, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import {
  advisors,
  lenders,
  mortgageCaseAdvisors,
  mortgageCases,
} from "@/db/schema";
import type { OverviewFilters } from "@/lib/overview-params";

export type OverviewKpis = {
  inProgressCount: number;
  inProgressPrincipal: number;
  completedCount: number;
  completedPrincipal: number;
};

export type AdvisorStatsRow = {
  advisorId: string | null;
  advisorName: string;
  prospects: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  principalInProgress: number;
  principalCompleted: number;
  principalTotal: number;
};

export type LenderStatsRow = {
  lenderId: string | null;
  lenderName: string;
  dossiers: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  principalTotal: number;
  principalCompleted: number;
  averagePrincipal: number;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Year filter:
 * - afgehandeld → passing_date year
 * - other phases → application_date year
 * - null relevant date → excluded from a specific year, included in "all periods"
 *
 * Advisor filter uses EXISTS on mortgage_case_advisors so shared dossiers
 * match without duplicating rows in organisation KPIs / lender stats.
 */
function buildOverviewWhere(filters: OverviewFilters): SQL | undefined {
  const clauses: SQL[] = [];

  if (filters.advisorId) {
    clauses.push(sql`EXISTS (
      SELECT 1
      FROM ${mortgageCaseAdvisors} mca
      WHERE mca.mortgage_case_id = ${mortgageCases.id}
        AND mca.advisor_id = ${filters.advisorId}
    )`);
  }

  if (filters.lenderId) {
    clauses.push(eq(mortgageCases.lenderId, filters.lenderId));
  }

  if (filters.phase) {
    clauses.push(eq(mortgageCases.phase, filters.phase));
  }

  if (filters.year != null) {
    const year = filters.year;
    clauses.push(sql`(
      (
        ${mortgageCases.phase} = 'afgehandeld'
        AND ${mortgageCases.passingDate} IS NOT NULL
        AND EXTRACT(YEAR FROM ${mortgageCases.passingDate})::int = ${year}
      )
      OR
      (
        ${mortgageCases.phase} <> 'afgehandeld'
        AND ${mortgageCases.applicationDate} IS NOT NULL
        AND EXTRACT(YEAR FROM ${mortgageCases.applicationDate})::int = ${year}
      )
    )`);
  }

  if (clauses.length === 0) return undefined;
  return and(...clauses);
}

/** Distinct years available from application_date / passing_date. */
export async function getOverviewYears(): Promise<number[]> {
  const db = getDb();

  const yearExpr = sql`(
    CASE
      WHEN ${mortgageCases.phase} = 'afgehandeld'
        THEN EXTRACT(YEAR FROM ${mortgageCases.passingDate})::int
      ELSE EXTRACT(YEAR FROM ${mortgageCases.applicationDate})::int
    END
  )`;

  const rows = await db
    .select({
      year: sql<string>`${yearExpr}`.as("year"),
    })
    .from(mortgageCases)
    .where(
      sql`(
        (
          ${mortgageCases.phase} = 'afgehandeld'
          AND ${mortgageCases.passingDate} IS NOT NULL
        )
        OR
        (
          ${mortgageCases.phase} <> 'afgehandeld'
          AND ${mortgageCases.applicationDate} IS NOT NULL
        )
      )`,
    )
    .groupBy(yearExpr)
    .orderBy(sql`${yearExpr} DESC`);

  return rows
    .map((row) => Number(row.year))
    .filter((year) => Number.isFinite(year));
}

/** Organisation KPIs: each mortgage case counted once (no double-count on shared advisors). */
export async function getOverviewKpis(
  filters: OverviewFilters,
): Promise<OverviewKpis> {
  const db = getDb();
  const where = buildOverviewWhere(filters);

  const rows = await db
    .select({
      inProgressCount: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'in_behandeling' then 1 else 0 end), 0)`,
      inProgressPrincipal: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'in_behandeling' then ${mortgageCases.principalAmount}::numeric else 0 end), 0)`,
      completedCount: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'afgehandeld' then 1 else 0 end), 0)`,
      completedPrincipal: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'afgehandeld' then ${mortgageCases.principalAmount}::numeric else 0 end), 0)`,
    })
    .from(mortgageCases)
    .where(where);

  const row = rows[0];
  return {
    inProgressCount: toNumber(row?.inProgressCount),
    inProgressPrincipal: toNumber(row?.inProgressPrincipal),
    completedCount: toNumber(row?.completedCount),
    completedPrincipal: toNumber(row?.completedPrincipal),
  };
}

/**
 * Per-advisor stats via mortgage_case_advisors.
 * A shared dossier counts fully for each linked advisor (no 50/50 split).
 * Cases without advisors appear as "Geen adviseur".
 */
export async function getAdvisorStatistics(
  filters: OverviewFilters,
): Promise<AdvisorStatsRow[]> {
  const db = getDb();
  const where = buildOverviewWhere(filters);

  const rows = await db
    .select({
      advisorId: mortgageCaseAdvisors.advisorId,
      advisorName: advisors.name,
      prospects: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'prospect' then 1 else 0 end), 0)`,
      inProgress: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'in_behandeling' then 1 else 0 end), 0)`,
      completed: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'afgehandeld' then 1 else 0 end), 0)`,
      cancelled: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'geannuleerd' then 1 else 0 end), 0)`,
      principalInProgress: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'in_behandeling' then ${mortgageCases.principalAmount}::numeric else 0 end), 0)`,
      principalCompleted: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'afgehandeld' then ${mortgageCases.principalAmount}::numeric else 0 end), 0)`,
      principalTotal: sql<string>`coalesce(sum(${mortgageCases.principalAmount}::numeric), 0)`,
    })
    .from(mortgageCases)
    .leftJoin(
      mortgageCaseAdvisors,
      eq(mortgageCases.id, mortgageCaseAdvisors.mortgageCaseId),
    )
    .leftJoin(advisors, eq(mortgageCaseAdvisors.advisorId, advisors.id))
    .where(where)
    .groupBy(mortgageCaseAdvisors.advisorId, advisors.name)
    .orderBy(
      sql`coalesce(sum(case when ${mortgageCases.phase} = 'afgehandeld' then 1 else 0 end), 0) DESC`,
      sql`coalesce(sum(case when ${mortgageCases.phase} = 'afgehandeld' then ${mortgageCases.principalAmount}::numeric else 0 end), 0) DESC`,
      sql`coalesce(${advisors.name}, 'Geen adviseur') ASC`,
    );

  return rows.map((row) => ({
    advisorId: row.advisorId,
    advisorName: row.advisorName?.trim() || "Geen adviseur",
    prospects: toNumber(row.prospects),
    inProgress: toNumber(row.inProgress),
    completed: toNumber(row.completed),
    cancelled: toNumber(row.cancelled),
    principalInProgress: toNumber(row.principalInProgress),
    principalCompleted: toNumber(row.principalCompleted),
    principalTotal: toNumber(row.principalTotal),
  }));
}

/** Lender stats stay one row per case (organisation view, no advisor fan-out). */
export async function getLenderStatistics(
  filters: OverviewFilters,
): Promise<LenderStatsRow[]> {
  const db = getDb();
  const where = buildOverviewWhere(filters);

  const rows = await db
    .select({
      lenderId: mortgageCases.lenderId,
      lenderName: lenders.name,
      dossiers: sql<string>`count(*)`,
      inProgress: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'in_behandeling' then 1 else 0 end), 0)`,
      completed: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'afgehandeld' then 1 else 0 end), 0)`,
      cancelled: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'geannuleerd' then 1 else 0 end), 0)`,
      principalTotal: sql<string>`coalesce(sum(${mortgageCases.principalAmount}::numeric), 0)`,
      principalCompleted: sql<string>`coalesce(sum(case when ${mortgageCases.phase} = 'afgehandeld' then ${mortgageCases.principalAmount}::numeric else 0 end), 0)`,
      averagePrincipal: sql<string>`coalesce(avg(${mortgageCases.principalAmount}::numeric), 0)`,
    })
    .from(mortgageCases)
    .leftJoin(lenders, eq(mortgageCases.lenderId, lenders.id))
    .where(where)
    .groupBy(mortgageCases.lenderId, lenders.name)
    .orderBy(
      sql`coalesce(sum(${mortgageCases.principalAmount}::numeric), 0) DESC`,
      sql`coalesce(${lenders.name}, 'Geen geldverstrekker') ASC`,
    );

  return rows.map((row) => ({
    lenderId: row.lenderId,
    lenderName: row.lenderName?.trim() || "Geen geldverstrekker",
    dossiers: toNumber(row.dossiers),
    inProgress: toNumber(row.inProgress),
    completed: toNumber(row.completed),
    cancelled: toNumber(row.cancelled),
    principalTotal: toNumber(row.principalTotal),
    principalCompleted: toNumber(row.principalCompleted),
    averagePrincipal: Math.round(toNumber(row.averagePrincipal)),
  }));
}
