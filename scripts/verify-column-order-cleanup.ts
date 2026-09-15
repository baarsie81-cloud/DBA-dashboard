/**
 * Short check: column-order normalize drops removed keys and inserts new ones.
 * Run: npx tsx scripts/verify-column-order-cleanup.ts
 */
import { normalizeMortgageColumnOrder } from "../src/lib/mortgage-column-order";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const normalized = normalizeMortgageColumnOrder([
  "customer_name",
  "advisor",
  "lender",
  "principal_amount",
  "application_date",
  "financing_condition_date",
  "passing_date",
  "offer_expiry_date",
  "actions",
  "fee_processing_date",
  "phase",
]);

assert(!normalized.includes("offer_expiry_date" as never), "offer removed");
assert(!normalized.includes("actions" as never), "actions removed");
assert(normalized.includes("guarantee_date"), "guarantee_date added");
assert(normalized.includes("bank_guarantee"), "bank_guarantee added");
assert(normalized.includes("svn"), "svn kept/added");

const finIdx = normalized.indexOf("financing_condition_date");
const gIdx = normalized.indexOf("guarantee_date");
const bIdx = normalized.indexOf("bank_guarantee");
assert(gIdx === finIdx + 1, "guarantee_date after ontbindende");
assert(bIdx === gIdx + 1, "bank_guarantee after guarantee_date");

console.log("OK:", normalized.join(" → "));
