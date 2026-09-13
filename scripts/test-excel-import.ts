import "dotenv/config";
import * as XLSX from "xlsx";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { mortgageCases } from "../src/db/schema";
import { DBA_COLUMNS, DBA_SHEETS } from "../src/lib/excel-import/constants";
import { parseDbaWorkbook } from "../src/lib/excel-import/parse-workbook";
import { executeImport } from "../src/lib/excel-import/run-import";

function buildTestWorkbook(): ArrayBuffer {
  const headers = Object.values(DBA_COLUMNS);
  const rowA = [
    "Jansen", "T.", null, "René de Boer", "Annuïteit", "2026-08-12", "Rabobank",
    "450000", "2026-09-01", "2026-09-28", "2026-09-05", "Aangevraagd", "2026-10-15",
    "Wacht op taxatie", "Bel notaris", "2026-09-10", "2750", null, "2026-10-01",
  ];
  const rowB = [
    "de Vries", "M.", null, "Sanne Jansen / Marco Visser", "Lineair", "2026-08-05", "ING",
    "325000", "2026-08-28", "2026-09-20", null, "Nee", "2026-10-10",
    "In behandeling", null, null, "2450", null, null,
  ];

  const preamble = [
    ["DBA Hypotheekoverzicht"],
    ["Legenda"],
    [],
    [],
    [],
  ];

  const wb = XLSX.utils.book_new();
  for (const sheetName of DBA_SHEETS) {
    const aoa =
      sheetName === "In behandeling"
        ? [...preamble, headers, rowA, rowB]
        : [...preamble, headers];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  }

  console.log("built_sheets", wb.SheetNames);
  const bytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function countImported(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mortgageCases)
    .where(sql`${mortgageCases.legacyImportKey} is not null`);
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const started = Date.now();
  const buffer = buildTestWorkbook();
  const parsed = parseDbaWorkbook(buffer);
  if (!parsed.ok) {
    console.error("PARSE_FAIL", parsed.message);
    process.exit(1);
  }
  console.log("parsed_rows", parsed.rows.length, "issues", parsed.issues.length);
  console.log(
    "sample",
    parsed.rows.map((row) => ({
      customer: row.customerName,
      key: row.legacyImportKey,
      advisors: row.advisorLabels,
      phase: row.phase,
    })),
  );

  const db = getDb();
  await db
    .delete(mortgageCases)
    .where(sql`${mortgageCases.legacyImportKey} like 'v1|jansen|%'`);
  await db
    .delete(mortgageCases)
    .where(sql`${mortgageCases.legacyImportKey} like 'v1|de vries|%'`);

  const before = await countImported();
  const first = await executeImport(parsed.rows, parsed.issues, "test-dba.xlsx");
  const afterFirst = await countImported();
  console.log("first_import", {
    newCount: first.newCount,
    updatedCount: first.updatedCount,
    unchangedCount: first.unchangedCount,
    errorCount: first.errorCount,
    errors: first.errors,
  });
  console.log("imported_cases_after_first", afterFirst, "delta", afterFirst - before);

  const second = await executeImport(parsed.rows, parsed.issues, "test-dba.xlsx");
  const afterSecond = await countImported();
  console.log("second_import", {
    newCount: second.newCount,
    updatedCount: second.updatedCount,
    unchangedCount: second.unchangedCount,
    errorCount: second.errorCount,
  });
  console.log("imported_cases_after_second", afterSecond);

  const ok =
    afterSecond === afterFirst &&
    second.newCount === 0 &&
    first.newCount >= 2 &&
    second.unchangedCount >= 2 &&
    afterFirst - before === first.newCount;

  console.log("idempotent", ok);
  console.log("elapsed_ms", Date.now() - started);
  process.exit(ok ? 0 : 2);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
