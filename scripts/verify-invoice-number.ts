/**
 * Short checks for invoice_number column order + Excel reimport protection.
 * Run: npx tsx scripts/verify-invoice-number.ts
 */
import { normalizeMortgageColumnOrder } from "../src/lib/mortgage-column-order";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const normalized = normalizeMortgageColumnOrder([
  "customer_name",
  "advisor",
  "lender",
  "principal_amount",
  "fee",
  "phase",
]);

assert(normalized.includes("invoice_number"), "invoice_number inserted");
const customerIdx = normalized.indexOf("customer_name");
const invoiceIdx = normalized.indexOf("invoice_number");
assert(invoiceIdx === customerIdx + 1, "invoice_number after customer_name");

const alreadyHas = normalizeMortgageColumnOrder([
  "customer_name",
  "invoice_number",
  "advisor",
]);
assert(
  alreadyHas.filter((key) => key === "invoice_number").length === 1,
  "no duplicate invoice_number",
);

const importSource = readFileSync(
  resolve("src/lib/excel-import/run-import.ts"),
  "utf8",
);
assert(
  importSource.includes("invoice_number"),
  "excel reimport documents invoice_number as dashboard-only",
);
assert(
  !/invoiceNumber:\s*payload/.test(importSource),
  "excel reimport must not set invoiceNumber from payload",
);

console.log("verify-invoice-number: OK");
