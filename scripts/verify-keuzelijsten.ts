/**
 * Short formatter / normalization checks (no DB).
 * Run: npx tsx scripts/verify-keuzelijsten.ts
 */
import { normalizeBankGuaranteeFromExcel } from "../src/lib/bank-guarantee-options";
import {
  formatFeeProcessingMonth,
  parseFeeProcessingMonthInput,
  toMonthStartIso,
} from "../src/lib/fee-processing-month";
import {
  isKnownMortgageType,
  mortgageTypeSelectOptions,
} from "../src/lib/mortgage-type-options";
import { parseExcelDate } from "../src/lib/excel-import/normalize";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(toMonthStartIso("2026-09-15") === "2026-09-01", "day → month start");
assert(
  parseFeeProcessingMonthInput("2026-02-01").ok &&
    (parseFeeProcessingMonthInput("2026-02-01") as { value: string }).value ===
      "2026-02-01",
  "month select parse",
);
assert(formatFeeProcessingMonth("2026-03-15") === "maart 2026", "table format");

assert(!isKnownMortgageType("Annuïteit"), "legacy type not known");
const typeOpts = mortgageTypeSelectOptions("Annuïteit");
assert(
  typeOpts.some((o) => o.value === "Annuïteit"),
  "legacy mortgage type kept in select",
);

assert(
  normalizeBankGuaranteeFromExcel("Bankgarantie geregeld") ===
    "Bankgarantie geregeld",
  "exact BG map",
);
assert(
  normalizeBankGuaranteeFromExcel("Aangevraagd") === "Aangevraagd",
  "unknown BG kept",
);

const excelDay = parseExcelDate("15-09-2026");
assert(excelDay.ok === true, "excel day parse ok");
if (!excelDay.ok) throw new Error("unreachable");
assert(excelDay.value === "2026-09-15", "excel day parse value");
assert(toMonthStartIso(excelDay.value!) === "2026-09-01", "excel day→month");

const excelMonth = parseExcelDate("09-2026");
assert(excelMonth.ok === true, "excel month-only ok");
if (!excelMonth.ok) throw new Error("unreachable");
assert(excelMonth.value === "2026-09-01", "excel month-only");

console.log("OK: keuzelijsten / vergoeding normalization checks passed");
