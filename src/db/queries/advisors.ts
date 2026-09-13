import { asc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { advisors, type Advisor } from "@/db/schema";

export type AdvisorOption = {
  id: string;
  name: string;
  active: boolean;
};

export type AdvisorWriteInput = {
  name: string;
  active: boolean;
};

/** Active advisors, optionally including currently linked (possibly inactive) advisors. */
export async function getAdvisorOptions(
  includeIds?: string | string[] | null,
): Promise<AdvisorOption[]> {
  const db = getDb();
  const ids = Array.isArray(includeIds)
    ? includeIds.filter(Boolean)
    : includeIds
      ? [includeIds]
      : [];

  const rows = await db
    .select({
      id: advisors.id,
      name: advisors.name,
      active: advisors.active,
    })
    .from(advisors)
    .where(
      ids.length > 0
        ? or(eq(advisors.active, true), inArray(advisors.id, ids))
        : eq(advisors.active, true),
    )
    .orderBy(asc(advisors.name));

  return rows;
}

export async function getActiveAdvisors(): Promise<AdvisorOption[]> {
  return getAdvisorOptions(null);
}

/** All advisors for the management page. */
export async function listAdvisors(): Promise<AdvisorOption[]> {
  const db = getDb();
  return db
    .select({
      id: advisors.id,
      name: advisors.name,
      active: advisors.active,
    })
    .from(advisors)
    .orderBy(asc(advisors.name));
}

export async function getAdvisorById(id: string): Promise<Advisor | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(advisors)
    .where(eq(advisors.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Case-insensitive name lookup; optionally exclude an id (for updates). */
export async function findAdvisorByName(
  name: string,
  excludeId?: string | null,
): Promise<AdvisorOption | null> {
  const db = getDb();
  const normalized = name.trim().toLowerCase();
  const rows = await db
    .select({
      id: advisors.id,
      name: advisors.name,
      active: advisors.active,
    })
    .from(advisors)
    .where(
      excludeId
        ? sql`lower(${advisors.name}) = ${normalized} AND ${advisors.id} <> ${excludeId}`
        : sql`lower(${advisors.name}) = ${normalized}`,
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createAdvisor(input: AdvisorWriteInput): Promise<Advisor> {
  const db = getDb();
  const [created] = await db
    .insert(advisors)
    .values({
      name: input.name,
      active: input.active,
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export async function updateAdvisor(
  id: string,
  input: AdvisorWriteInput,
): Promise<Advisor | null> {
  const db = getDb();
  const [updated] = await db
    .update(advisors)
    .set({
      name: input.name,
      active: input.active,
      updatedAt: new Date(),
    })
    .where(eq(advisors.id, id))
    .returning();
  return updated ?? null;
}
