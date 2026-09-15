import { asc, count, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  lenderAliases,
  lenders,
  mortgageCases,
  type Lender,
} from "@/db/schema";
import { normalizeLookupKey } from "@/lib/excel-import/normalize";

export type LenderOption = {
  id: string;
  name: string;
  active: boolean;
};

export type LenderWriteInput = {
  name: string;
  active: boolean;
};

export type ManagedLender = LenderOption & {
  caseCount: number;
};

export type LenderOperationErrorCode =
  | "NOT_FOUND"
  | "SAME_LENDER"
  | "LENDER_IN_USE";

export class LenderOperationError extends Error {
  constructor(public readonly code: LenderOperationErrorCode) {
    super(code);
    this.name = "LenderOperationError";
  }
}

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

/** All lenders, including inactive records. */
export async function listLenders(): Promise<LenderOption[]> {
  const db = getDb();
  return db
    .select({
      id: lenders.id,
      name: lenders.name,
      active: lenders.active,
    })
    .from(lenders)
    .orderBy(asc(lenders.name));
}

/** All lenders with their current case count for the management page. */
export async function listManagedLenders(): Promise<ManagedLender[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: lenders.id,
      name: lenders.name,
      active: lenders.active,
      caseCount: count(mortgageCases.id),
    })
    .from(lenders)
    .leftJoin(mortgageCases, eq(mortgageCases.lenderId, lenders.id))
    .groupBy(lenders.id, lenders.name, lenders.active)
    .orderBy(asc(lenders.name));

  return rows.map((row) => ({ ...row, caseCount: Number(row.caseCount) }));
}

export async function getLenderById(id: string): Promise<Lender | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(lenders)
    .where(eq(lenders.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Case-insensitive name lookup; optionally exclude an id (for updates). */
export async function findLenderByName(
  name: string,
  excludeId?: string | null,
): Promise<LenderOption | null> {
  const db = getDb();
  const normalized = name.trim().toLowerCase();
  const rows = await db
    .select({
      id: lenders.id,
      name: lenders.name,
      active: lenders.active,
    })
    .from(lenders)
    .where(
      excludeId
        ? sql`lower(${lenders.name}) = ${normalized} AND ${lenders.id} <> ${excludeId}`
        : sql`lower(${lenders.name}) = ${normalized}`,
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findLenderByAlias(
  name: string,
): Promise<LenderOption | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: lenders.id,
      name: lenders.name,
      active: lenders.active,
    })
    .from(lenderAliases)
    .innerJoin(lenders, eq(lenderAliases.lenderId, lenders.id))
    .where(eq(lenderAliases.normalizedAlias, normalizeLookupKey(name)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createLender(input: LenderWriteInput): Promise<Lender> {
  const db = getDb();
  const [created] = await db
    .insert(lenders)
    .values({
      name: input.name,
      active: input.active,
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export async function updateLender(
  id: string,
  input: LenderWriteInput,
): Promise<Lender | null> {
  const db = getDb();
  const [updated] = await db
    .update(lenders)
    .set({
      name: input.name,
      active: input.active,
      updatedAt: new Date(),
    })
    .where(eq(lenders.id, id))
    .returning();
  return updated ?? null;
}

export async function mergeLenders(
  sourceId: string,
  targetId: string,
): Promise<{ movedCaseCount: number }> {
  if (sourceId === targetId) {
    throw new LenderOperationError("SAME_LENDER");
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const lockedLenders = await tx
      .select({ id: lenders.id, name: lenders.name })
      .from(lenders)
      .where(inArray(lenders.id, [sourceId, targetId]))
      .orderBy(asc(lenders.id))
      .for("update");

    const source = lockedLenders.find((lender) => lender.id === sourceId);
    const target = lockedLenders.find((lender) => lender.id === targetId);
    if (!source || !target) {
      throw new LenderOperationError("NOT_FOUND");
    }

    const movedCases = await tx
      .update(mortgageCases)
      .set({ lenderId: targetId, updatedAt: new Date() })
      .where(eq(mortgageCases.lenderId, sourceId))
      .returning({ id: mortgageCases.id });

    await tx
      .update(lenderAliases)
      .set({ lenderId: targetId })
      .where(eq(lenderAliases.lenderId, sourceId));

    const aliasName = source.name.trim();
    await tx
      .insert(lenderAliases)
      .values({
        aliasName,
        normalizedAlias: normalizeLookupKey(aliasName),
        lenderId: targetId,
      })
      .onConflictDoUpdate({
        target: lenderAliases.normalizedAlias,
        set: { aliasName, lenderId: targetId },
      });

    await tx.delete(lenders).where(eq(lenders.id, sourceId));

    return { movedCaseCount: movedCases.length };
  });
}

export async function deleteUnusedLender(id: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [lender] = await tx
      .select({ id: lenders.id })
      .from(lenders)
      .where(eq(lenders.id, id))
      .limit(1)
      .for("update");

    if (!lender) {
      throw new LenderOperationError("NOT_FOUND");
    }

    const [usage] = await tx
      .select({ value: count(mortgageCases.id) })
      .from(mortgageCases)
      .where(eq(mortgageCases.lenderId, id));

    if (Number(usage?.value ?? 0) > 0) {
      throw new LenderOperationError("LENDER_IN_USE");
    }

    await tx.delete(lenders).where(eq(lenders.id, id));
  });
}
