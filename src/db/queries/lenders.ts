import { asc, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { lenders, type Lender } from "@/db/schema";

export type LenderOption = {
  id: string;
  name: string;
  active: boolean;
};

export type LenderWriteInput = {
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

/** All lenders for the management page. */
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
