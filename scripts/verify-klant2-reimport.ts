/**
 * Short check: Excel reimport updates Klant 1 and preserves Klant 2.
 * Run: npx tsx scripts/verify-klant2-reimport.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { mortgageCases } from "../src/db/schema";
import {
  buildLegacyCustomerNameFromKlant1,
  combineExcelLastName,
} from "../src/lib/customer-name";

async function main() {
  const db = getDb();

  const [row] = await db
    .select({
      id: mortgageCases.id,
      legacyImportKey: mortgageCases.legacyImportKey,
      customerName: mortgageCases.customerName,
      customer1LastName: mortgageCases.customer1LastName,
      customer1Initials: mortgageCases.customer1Initials,
      customer2LastName: mortgageCases.customer2LastName,
      customer2Initials: mortgageCases.customer2Initials,
    })
    .from(mortgageCases)
    .where(eq(mortgageCases.legacyImportKey, mortgageCases.legacyImportKey))
    .limit(1);

  // Prefer a dossier that already has a legacy key.
  const [imported] = await db
    .select({
      id: mortgageCases.id,
      legacyImportKey: mortgageCases.legacyImportKey,
      customer1LastName: mortgageCases.customer1LastName,
      customer1Initials: mortgageCases.customer1Initials,
      customer2LastName: mortgageCases.customer2LastName,
      customer2Initials: mortgageCases.customer2Initials,
      customerName: mortgageCases.customerName,
    })
    .from(mortgageCases)
    .where(eq(mortgageCases.id, row.id));

  if (!imported?.legacyImportKey) {
    // Fall back: pick any row with a non-null legacy key via raw filter.
    const candidates = await db
      .select({
        id: mortgageCases.id,
        legacyImportKey: mortgageCases.legacyImportKey,
        customer1LastName: mortgageCases.customer1LastName,
        customer1Initials: mortgageCases.customer1Initials,
        customer2LastName: mortgageCases.customer2LastName,
        customer2Initials: mortgageCases.customer2Initials,
        customerName: mortgageCases.customerName,
      })
      .from(mortgageCases)
      .limit(50);

    const withKey = candidates.find((c) => c.legacyImportKey);
    if (!withKey) throw new Error("No imported dossier found for reimport check");
    Object.assign(imported, withKey);
  }

  const target = imported;
  if (!target.legacyImportKey) {
    throw new Error("Target missing legacy_import_key");
  }

  const partnerLast = "Testpartner";
  const partnerInitials = "Q.";
  const originalC2 = {
    last: target.customer2LastName,
    initials: target.customer2Initials,
  };

  await db
    .update(mortgageCases)
    .set({
      customer2LastName: partnerLast,
      customer2Initials: partnerInitials,
    })
    .where(eq(mortgageCases.id, target.id));

  // Simulate Excel reimport write path for Klant 1 only (same as executeImport update).
  const excelLast = "Vries";
  const excelInfix = "de";
  const excelInitials = "M.";
  const customer1LastName = combineExcelLastName(excelLast, excelInfix)!;
  const customer1Initials = excelInitials;
  const customerName = buildLegacyCustomerNameFromKlant1(
    customer1LastName,
    customer1Initials,
  );

  await db
    .update(mortgageCases)
    .set({
      customerName,
      customer1LastName,
      customer1Initials,
      // intentionally omit customer2*
    })
    .where(eq(mortgageCases.id, target.id));

  const [after] = await db
    .select({
      customerName: mortgageCases.customerName,
      customer1LastName: mortgageCases.customer1LastName,
      customer1Initials: mortgageCases.customer1Initials,
      customer2LastName: mortgageCases.customer2LastName,
      customer2Initials: mortgageCases.customer2Initials,
    })
    .from(mortgageCases)
    .where(eq(mortgageCases.id, target.id));

  const ok =
    after.customer1LastName === "de Vries" &&
    after.customer1Initials === "M." &&
    after.customerName === "de Vries, M." &&
    after.customer2LastName === partnerLast &&
    after.customer2Initials === partnerInitials;

  // Restore original Klant 1 + Klant 2 for the production dossier.
  await db
    .update(mortgageCases)
    .set({
      customerName: target.customerName,
      customer1LastName: target.customer1LastName,
      customer1Initials: target.customer1Initials,
      customer2LastName: originalC2.last,
      customer2Initials: originalC2.initials,
    })
    .where(eq(mortgageCases.id, target.id));

  console.log(
    JSON.stringify(
      {
        ok,
        dossierId: target.id,
        legacyImportKey: target.legacyImportKey,
        afterBeforeRestore: after,
        restored: true,
      },
      null,
      2,
    ),
  );

  if (!ok) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
