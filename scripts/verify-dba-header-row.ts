/**
 * Verifies that a workbook shaped like the real DBA Excel format
 * (title/legend in rows 1–5, headers on row 6) is accepted by the parser
 * and can continue into the import-preview path.
 */
import "dotenv/config";
import * as XLSX from "xlsx";
import { DBA_COLUMNS, DBA_SHEETS } from "../src/lib/excel-import/constants";
import { parseDbaWorkbook } from "../src/lib/excel-import/parse-workbook";
import { buildImportPreview } from "../src/lib/excel-import/run-import";

function buildRealFormatWorkbook(): ArrayBuffer {
  const headers = Object.values(DBA_COLUMNS);
  const dataRow = [
    "Jansen",
    "T.",
    null,
    "René de Boer",
    "Annuïteit",
    "2026-08-12",
    "Rabobank",
    "450000",
    "2026-09-01",
    "2026-09-28",
    "2026-09-05",
    "Aangevraagd",
    "2026-10-15",
    "Wacht op taxatie",
    "Bel notaris",
    "2026-09-10",
    "2750",
    null,
    "2026-10-01",
  ];

  const wb = XLSX.utils.book_new();
  for (const sheetName of DBA_SHEETS) {
    const preamble = [
      [`DBA Hypotheekoverzicht — ${sheetName}`],
      ["Legenda: statuskleuren"],
      [],
      [],
      [],
    ];
    const aoa =
      sheetName === "In behandeling"
        ? [...preamble, headers, dataRow]
        : [...preamble, headers];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  }

  const bytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function buildLegacyHeaderRowWorkbook(): ArrayBuffer {
  const headers = Object.values(DBA_COLUMNS);
  const wb = XLSX.utils.book_new();
  for (const sheetName of DBA_SHEETS) {
    const sheet = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  }
  const bytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function main() {
  const legacy = parseDbaWorkbook(buildLegacyHeaderRowWorkbook());
  if (legacy.ok) {
    console.error("LEGACY_ROW1_SHOULD_FAIL");
    process.exit(4);
  }
  console.log("legacy_row1_rejected", true);

  const buffer = buildRealFormatWorkbook();
  const parsed = parseDbaWorkbook(buffer);

  if (!parsed.ok) {
    console.error("FORMAT_REJECTED", parsed.message);
    process.exit(1);
  }

  console.log("parse_ok", true);
  console.log("parsed_rows", parsed.rows.length);
  console.log("parsed_issues", parsed.issues.length);
  console.log(
    "sample",
    parsed.rows.map((row) => ({
      sheet: row.sheet,
      excelRowNumber: row.excelRowNumber,
      customer: row.customerName,
      phase: row.phase,
    })),
  );

  if (parsed.rows.length < 1) {
    console.error("EXPECTED_DATA_ROW_MISSING");
    process.exit(2);
  }

  if (parsed.rows.some((row) => row.excelRowNumber !== 7)) {
    console.error(
      "UNEXPECTED_ROW_NUMBER",
      parsed.rows.map((row) => row.excelRowNumber),
    );
    process.exit(3);
  }

  // Same preview path the UI uses after a successful parse.
  const preview = await buildImportPreview(parsed.rows, parsed.issues, {
    createLookups: false,
  });
  console.log("preview_ok", true);
  console.log("preview_counts", {
    total: preview.totalRows,
    newCount: preview.newCount,
    updatedCount: preview.updatedCount,
    unchangedCount: preview.unchangedCount,
    errorCount: preview.errorCount,
  });

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
