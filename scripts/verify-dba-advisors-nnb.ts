/**
 * Short parser check for DBA advisor codes + NNB principal handling.
 * No production import — mapping/normalize only (+ optional workbook parse).
 */
import * as XLSX from "xlsx";
import { DBA_COLUMNS, DBA_SHEETS } from "../src/lib/excel-import/constants";
import {
  parseExcelAmount,
  resolveAdvisorAlias,
  splitAdvisorLabels,
} from "../src/lib/excel-import/normalize";
import { parseDbaWorkbook } from "../src/lib/excel-import/parse-workbook";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL", message);
    process.exit(1);
  }
}

function checkAliases() {
  assert(resolveAdvisorAlias("DD") === "Django", "DD → Django");
  assert(resolveAdvisorAlias("dd") === "Django", "dd → Django");
  assert(resolveAdvisorAlias("RB") === "René", "RB → René");
  assert(resolveAdvisorAlias("WL") === "Wim", "WL → Wim");
  assert(resolveAdvisorAlias("BB") === "Bert", "BB → Bert");

  const comboCases = [
    "DD / WL",
    "DD/WL",
    "WL/DD",
    "DD / RB",
    "DD/ BB",
    "RB & WL",
  ];

  for (const raw of comboCases) {
    const mapped = splitAdvisorLabels(raw).map(resolveAdvisorAlias);
    assert(mapped.length === 2, `${raw} should split into 2`);
    assert(new Set(mapped).size === 2, `${raw} should map to 2 distinct advisors`);
    for (const name of mapped) {
      assert(
        ["Django", "René", "Wim", "Bert"].includes(name),
        `${raw} mapped unexpected "${name}"`,
      );
    }
  }

  assert(
    resolveAdvisorAlias("XX") === "XX",
    "unknown code stays unchanged (no inventing)",
  );
  console.log("alias_ok", true);
}

function checkPrincipalNnb() {
  for (const raw of ["", "-", "NVT", "nvt", "NNB", "nnb", null, undefined]) {
    const parsed = parseExcelAmount(raw as never);
    assert(parsed.ok, `principal ${String(raw)} should be ok`);
    if (!parsed.ok) return;
    assert(parsed.value == null, `principal ${String(raw)} should be null`);
  }

  const bad = parseExcelAmount("abc");
  assert(!bad.ok, "invalid principal remains an error");
  console.log("principal_nnb_ok", true);
}

function buildWorkbookWithCodesAndNnb(): ArrayBuffer {
  const headers = Object.values(DBA_COLUMNS);
  const dataRow = headers.map((header) => {
    if (header === DBA_COLUMNS.lastName) return "Testklant";
    if (header === DBA_COLUMNS.initials) return "A.";
    if (header === DBA_COLUMNS.advisor) return "DD / WL";
    if (header === DBA_COLUMNS.principalAmount) return "NNB";
    if (header === DBA_COLUMNS.applicationDate) return "2026-08-12";
    return null;
  });

  const preamble = [["Titel"], ["Legenda"], [], [], []];
  const wb = XLSX.utils.book_new();
  for (const sheetName of DBA_SHEETS) {
    const aoa =
      sheetName === "In behandeling"
        ? [...preamble, headers, dataRow]
        : [...preamble, headers];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName);
  }

  const bytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function checkWorkbookParse() {
  const parsed = parseDbaWorkbook(buildWorkbookWithCodesAndNnb());
  assert(parsed.ok, "workbook with DD/WL + NNB should parse");
  if (!parsed.ok) return;

  assert(parsed.rows.length === 1, "expected one data row");
  const row = parsed.rows[0]!;
  assert(row.principalAmount == null, "NNB principal becomes null");
  assert(
    row.advisorLabels.map(resolveAdvisorAlias).join("|") === "Django|Wim",
    `advisors should be Django|Wim, got ${row.advisorLabels.join("|")}`,
  );
  console.log("workbook_parse_ok", {
    advisors: row.advisorLabels.map(resolveAdvisorAlias),
    principalAmount: row.principalAmount,
  });
}

checkAliases();
checkPrincipalNnb();
checkWorkbookParse();
console.log("all_checks_passed");
