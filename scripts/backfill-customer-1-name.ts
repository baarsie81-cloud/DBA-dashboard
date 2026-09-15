/**
 * Safe, idempotent backfill: customer_name → Klant 1 fields.
 * Does not modify customer_name. Leaves Klant 2 null. Never deletes rows.
 *
 * Usage: npx tsx scripts/backfill-customer-1-name.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { mortgageCases } from "../src/db/schema";
import { parseLegacyCustomerName } from "../src/lib/parse-legacy-customer-name";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const db = getDb();

  const beforeRows = await db
    .select({
      id: mortgageCases.id,
      customerName: mortgageCases.customerName,
      customer1LastName: mortgageCases.customer1LastName,
      customer1Initials: mortgageCases.customer1Initials,
    })
    .from(mortgageCases);

  const beforeCount = beforeRows.length;
  console.log(JSON.stringify({ phase: "before", total: beforeCount }));

  let updated = 0;
  let fullyParsed = 0;
  let notFullyParsed = 0;
  const unparsedSamples: string[] = [];

  for (const row of beforeRows) {
    const parsed = parseLegacyCustomerName(row.customerName);
    if (parsed.fullyParsed) {
      fullyParsed += 1;
    } else {
      notFullyParsed += 1;
      if (unparsedSamples.length < 30) {
        unparsedSamples.push(row.customerName);
      }
    }

    // Only fill when currently empty — never overwrite manual values.
    const nextLastName = row.customer1LastName ?? parsed.customer1LastName;
    const nextInitials = row.customer1Initials ?? parsed.customer1Initials;

    const changed =
      nextLastName !== row.customer1LastName ||
      nextInitials !== row.customer1Initials;

    if (!changed) continue;

    await db
      .update(mortgageCases)
      .set({
        customer1LastName: nextLastName,
        customer1Initials: nextInitials,
      })
      .where(eq(mortgageCases.id, row.id));

    updated += 1;
  }

  const afterRows = await db
    .select({
      customerName: mortgageCases.customerName,
      customer1LastName: mortgageCases.customer1LastName,
      customer1Initials: mortgageCases.customer1Initials,
      customer2LastName: mortgageCases.customer2LastName,
      customer2Initials: mortgageCases.customer2Initials,
    })
    .from(mortgageCases);

  const afterCount = afterRows.length;
  const emptyCustomerName = afterRows.filter(
    (row) => !row.customerName || !row.customerName.trim(),
  ).length;
  const withC1Last = afterRows.filter((row) => row.customer1LastName != null).length;
  const withC1Initials = afterRows.filter(
    (row) => row.customer1Initials != null,
  ).length;
  const withC2Last = afterRows.filter((row) => row.customer2LastName != null).length;
  const withC2Initials = afterRows.filter(
    (row) => row.customer2Initials != null,
  ).length;

  console.log(
    JSON.stringify(
      {
        phase: "after",
        beforeCount,
        afterCount,
        updated,
        fullyParsed,
        notFullyParsed,
        emptyCustomerName,
        withC1Last,
        withC1Initials,
        withC2Last,
        withC2Initials,
        unparsedSamples,
      },
      null,
      2,
    ),
  );

  if (afterCount !== beforeCount) {
    throw new Error(
      `Row count changed during backfill: before=${beforeCount} after=${afterCount}`,
    );
  }
  if (emptyCustomerName > 0) {
    throw new Error(`customer_name empty on ${emptyCustomerName} rows`);
  }
  if (withC2Last > 0 || withC2Initials > 0) {
    throw new Error("Unexpected non-null Klant 2 fields after legacy backfill");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
