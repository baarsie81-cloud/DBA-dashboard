/**
 * Short check: Excel-style reimport update preserves dashboard-only fields.
 */
import "dotenv/config";
import { eq, isNotNull } from "drizzle-orm";
import { getDb } from "../src/db";
import { mortgageCases } from "../src/db/schema";
import { normalizeMortgageColumnOrder } from "../src/lib/mortgage-column-order";

async function main() {
  const order = normalizeMortgageColumnOrder([
    "customer_name",
    "advisor",
    "lender",
    "principal_amount",
    "application_date",
    "financing_condition_date",
    "passing_date",
    "offer_expiry_date",
    "fee_processing_date",
    "phase",
  ]);
  const svnIdx = order.indexOf("svn");
  const lenderIdx = order.indexOf("lender");
  const passIdx = order.indexOf("ready_for_passing");
  const passingDateIdx = order.indexOf("passing_date");
  if (svnIdx !== lenderIdx + 1) {
    throw new Error(`svn not after lender: ${order.join(",")}`);
  }
  if (passIdx !== passingDateIdx + 1) {
    throw new Error(`ready_for_passing not after passing_date: ${order.join(",")}`);
  }

  const db = getDb();
  const [target] = await db
    .select({
      id: mortgageCases.id,
      svn: mortgageCases.svn,
      readyForPassing: mortgageCases.readyForPassing,
      dossierYear: mortgageCases.dossierYear,
      customerName: mortgageCases.customerName,
    })
    .from(mortgageCases)
    .where(isNotNull(mortgageCases.legacyImportKey))
    .limit(1);

  if (!target) throw new Error("No imported dossier found");

  await db
    .update(mortgageCases)
    .set({
      svn: true,
      readyForPassing: true,
      dossierYear: 2027,
    })
    .where(eq(mortgageCases.id, target.id));

  // Simulate Excel reimport update (does not set dashboard-only fields).
  await db
    .update(mortgageCases)
    .set({
      customerName: target.customerName,
    })
    .where(eq(mortgageCases.id, target.id));

  const [after] = await db
    .select({
      svn: mortgageCases.svn,
      readyForPassing: mortgageCases.readyForPassing,
      dossierYear: mortgageCases.dossierYear,
    })
    .from(mortgageCases)
    .where(eq(mortgageCases.id, target.id));

  const ok =
    after.svn === true &&
    after.readyForPassing === true &&
    after.dossierYear === 2027;

  await db
    .update(mortgageCases)
    .set({
      svn: target.svn,
      readyForPassing: target.readyForPassing,
      dossierYear: target.dossierYear,
    })
    .where(eq(mortgageCases.id, target.id));

  console.log(JSON.stringify({ ok, columnOrderOk: true, after, restored: true }, null, 2));
  if (!ok) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
