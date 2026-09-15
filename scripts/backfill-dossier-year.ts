/**
 * Controlled dossier_year backfill for existing production data.
 * Only sets dossier_year; never deletes rows or touches other fields.
 *
 * Rules:
 * - in_behandeling / afgehandeld → 2026
 * - prospect / geannuleerd → leave null
 *
 * Usage: npx tsx scripts/backfill-dossier-year.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const db = getDb();

  const before = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE phase = 'prospect')::int AS prospect,
      COUNT(*) FILTER (WHERE phase = 'in_behandeling')::int AS in_behandeling,
      COUNT(*) FILTER (WHERE phase = 'geannuleerd')::int AS geannuleerd,
      COUNT(*) FILTER (WHERE phase = 'afgehandeld')::int AS afgehandeld
    FROM mortgage_cases
  `);

  console.log(JSON.stringify({ phase: "before", stats: before[0] ?? before }, null, 2));

  await db.execute(sql`
    UPDATE mortgage_cases
    SET dossier_year = 2026
    WHERE phase IN ('in_behandeling', 'afgehandeld')
      AND dossier_year IS NULL
  `);

  const after = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE phase = 'prospect')::int AS prospect,
      COUNT(*) FILTER (WHERE phase = 'in_behandeling')::int AS in_behandeling,
      COUNT(*) FILTER (WHERE phase = 'geannuleerd')::int AS geannuleerd,
      COUNT(*) FILTER (WHERE phase = 'afgehandeld')::int AS afgehandeld,
      COUNT(*) FILTER (WHERE phase = 'in_behandeling' AND dossier_year = 2026)::int AS in_behandeling_2026,
      COUNT(*) FILTER (WHERE phase = 'afgehandeld' AND dossier_year = 2026)::int AS afgehandeld_2026,
      COUNT(*) FILTER (WHERE phase = 'prospect' AND dossier_year IS NOT NULL)::int AS prospect_with_year,
      COUNT(*) FILTER (WHERE phase = 'geannuleerd' AND dossier_year IS NOT NULL)::int AS geannuleerd_with_year,
      COUNT(*) FILTER (WHERE dossier_year IS NOT NULL)::int AS with_year
    FROM mortgage_cases
  `);

  const beforeTotal = Number((before[0] as { total: number }).total);
  const afterRow = after[0] as {
    total: number;
    in_behandeling_2026: number;
    afgehandeld_2026: number;
    prospect_with_year: number;
    geannuleerd_with_year: number;
  };

  console.log(JSON.stringify({ phase: "after", stats: afterRow }, null, 2));

  if (Number(afterRow.total) !== beforeTotal) {
    throw new Error(
      `Row count changed: before=${beforeTotal} after=${afterRow.total}`,
    );
  }
  if (Number(afterRow.prospect_with_year) !== 0) {
    throw new Error("Prospects unexpectedly received dossier_year");
  }
  if (Number(afterRow.geannuleerd_with_year) !== 0) {
    throw new Error("Geannuleerd unexpectedly received dossier_year");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
