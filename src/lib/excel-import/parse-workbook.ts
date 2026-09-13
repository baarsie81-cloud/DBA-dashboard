import * as XLSX from "xlsx";
import type { MortgagePhase } from "@/db/schema";
import {
  DBA_COLUMNS,
  DBA_SHEETS,
  FORMAT_ERROR_MESSAGE,
  REQUIRED_COLUMNS,
  SHEET_TO_PHASE,
  type DbaSheetName,
} from "./constants";
import {
  buildCustomerName,
  buildExcelNotesSection,
  buildLegacyImportKey,
  emptyToNull,
  parseExcelAmount,
  parseExcelDate,
  splitAdvisorLabels,
} from "./normalize";

export type ParsedImportRow = {
  sheet: DbaSheetName;
  excelRowNumber: number;
  phase: MortgagePhase;
  legacyImportKey: string;
  customerName: string;
  lastName: string;
  initials: string | null;
  infix: string | null;
  advisorLabels: string[];
  mortgageType: string | null;
  applicationDate: string | null;
  lenderName: string | null;
  principalAmount: string | null;
  lastCheckDate: string | null;
  financingConditionDate: string | null;
  guaranteeDate: string | null;
  bankGuarantee: string | null;
  passingDate: string | null;
  mortgageConfirmationDate: string | null;
  fee: string | null;
  feeProcessingDate: string | null;
  offerExpiryDate: string | null;
  excelNotesSection: string | null;
  warnings: string[];
};

export type ParseIssue = {
  sheet: string;
  excelRowNumber: number | null;
  customerLabel: string | null;
  reason: string;
};

export type ParseWorkbookResult =
  | { ok: true; rows: ParsedImportRow[]; issues: ParseIssue[] }
  | { ok: false; message: string };

type DateParse =
  | { ok: true; value: string | null }
  | { ok: false; raw: string };

function headerIndexMap(headers: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    if (header == null) return;
    const label = String(header).replace(/\s+/g, " ").trim();
    if (label) map.set(label, index);
  });
  return map;
}

function cell(
  row: unknown[],
  headers: Map<string, number>,
  column: string,
): unknown {
  const index = headers.get(column);
  if (index == null) return null;
  return row[index] ?? null;
}

function isRowEmpty(row: unknown[]): boolean {
  return row.every((value) => {
    if (value == null) return true;
    if (typeof value === "string" && !value.trim()) return true;
    return false;
  });
}

export function parseDbaWorkbook(buffer: ArrayBuffer): ParseWorkbookResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      raw: true,
    });
  } catch {
    return { ok: false, message: FORMAT_ERROR_MESSAGE };
  }

  const sheetNames = new Set(workbook.SheetNames);
  for (const required of DBA_SHEETS) {
    if (!sheetNames.has(required)) {
      return { ok: false, message: FORMAT_ERROR_MESSAGE };
    }
  }

  const rows: ParsedImportRow[] = [];
  const issues: ParseIssue[] = [];

  for (const sheetName of DBA_SHEETS) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(
      sheet,
      {
        header: 1,
        raw: true,
        defval: null,
        blankrows: false,
      },
    );

    // Header-only sheets are valid (no dossiers on that phase).
    if (matrix.length < 1) {
      return { ok: false, message: FORMAT_ERROR_MESSAGE };
    }

    const headers = headerIndexMap(matrix[0] ?? []);
    if (REQUIRED_COLUMNS.some((column) => !headers.has(column))) {
      return { ok: false, message: FORMAT_ERROR_MESSAGE };
    }

    const hasOfferExpiry = headers.has(DBA_COLUMNS.offerExpiryDate);
    const phase = SHEET_TO_PHASE[sheetName];

    for (let i = 1; i < matrix.length; i += 1) {
      const excelRowNumber = i + 1;
      const row = matrix[i] ?? [];
      if (isRowEmpty(row)) continue;

      const warnings: string[] = [];
      const lastName = emptyToNull(cell(row, headers, DBA_COLUMNS.lastName));
      const initials = emptyToNull(cell(row, headers, DBA_COLUMNS.initials));
      const infix = emptyToNull(cell(row, headers, DBA_COLUMNS.infix));
      const customerLabel =
        buildCustomerName(lastName, initials, infix) ??
        lastName ??
        `Rij ${excelRowNumber}`;

      if (!lastName) {
        issues.push({
          sheet: sheetName,
          excelRowNumber,
          customerLabel,
          reason: "Achternaam ontbreekt.",
        });
        continue;
      }

      const customerName = buildCustomerName(lastName, initials, infix);
      if (!customerName) {
        issues.push({
          sheet: sheetName,
          excelRowNumber,
          customerLabel,
          reason: "Klantnaam kon niet worden opgebouwd.",
        });
        continue;
      }

      const dateFields: Record<string, DateParse> = {
        applicationDate: parseExcelDate(
          cell(row, headers, DBA_COLUMNS.applicationDate),
        ),
        lastCheckDate: parseExcelDate(
          cell(row, headers, DBA_COLUMNS.lastCheckDate),
        ),
        financingConditionDate: parseExcelDate(
          cell(row, headers, DBA_COLUMNS.financingConditionDate),
        ),
        guaranteeDate: parseExcelDate(
          cell(row, headers, DBA_COLUMNS.guaranteeDate),
        ),
        passingDate: parseExcelDate(
          cell(row, headers, DBA_COLUMNS.passingDate),
        ),
        mortgageConfirmationDate: parseExcelDate(
          cell(row, headers, DBA_COLUMNS.mortgageConfirmationDate),
        ),
        feeProcessingDate: parseExcelDate(
          cell(row, headers, DBA_COLUMNS.feeProcessingDate),
        ),
        offerExpiryDate: hasOfferExpiry
          ? parseExcelDate(cell(row, headers, DBA_COLUMNS.offerExpiryDate))
          : { ok: true, value: null },
      };

      let rowFailed = false;
      for (const [field, parsed] of Object.entries(dateFields)) {
        if (!parsed.ok) {
          if (field === "applicationDate") {
            issues.push({
              sheet: sheetName,
              excelRowNumber,
              customerLabel,
              reason: `Ongeldige datum aanvraag ("${parsed.raw}").`,
            });
            rowFailed = true;
            break;
          }
          warnings.push(
            `Datumveld ${field} bevatte ongeldige waarde "${parsed.raw}" en is genegeerd.`,
          );
          dateFields[field] = { ok: true, value: null };
        }
      }
      if (rowFailed) continue;

      const principal = parseExcelAmount(
        cell(row, headers, DBA_COLUMNS.principalAmount),
      );
      if (!principal.ok) {
        issues.push({
          sheet: sheetName,
          excelRowNumber,
          customerLabel,
          reason: `Ongeldige hoofdsom ("${principal.raw}").`,
        });
        continue;
      }

      const feeParsed = parseExcelAmount(cell(row, headers, DBA_COLUMNS.fee));
      let feeValue: string | null = null;
      if (!feeParsed.ok) {
        warnings.push(
          `Tarief bevatte ongeldige waarde "${feeParsed.raw}" en is genegeerd.`,
        );
      } else {
        feeValue = feeParsed.value;
      }

      const advisorRaw = emptyToNull(cell(row, headers, DBA_COLUMNS.advisor));
      const advisorLabels = advisorRaw ? splitAdvisorLabels(advisorRaw) : [];
      const mortgageType = emptyToNull(
        cell(row, headers, DBA_COLUMNS.mortgageType),
      );
      const applicationDate = dateFields.applicationDate.ok
        ? dateFields.applicationDate.value
        : null;

      rows.push({
        sheet: sheetName,
        excelRowNumber,
        phase,
        legacyImportKey: buildLegacyImportKey({
          lastName,
          initials,
          infix,
          applicationDate,
          mortgageType,
        }),
        customerName,
        lastName,
        initials,
        infix,
        advisorLabels,
        mortgageType,
        applicationDate,
        lenderName: emptyToNull(cell(row, headers, DBA_COLUMNS.lender)),
        principalAmount: principal.value,
        lastCheckDate: dateFields.lastCheckDate.ok
          ? dateFields.lastCheckDate.value
          : null,
        financingConditionDate: dateFields.financingConditionDate.ok
          ? dateFields.financingConditionDate.value
          : null,
        guaranteeDate: dateFields.guaranteeDate.ok
          ? dateFields.guaranteeDate.value
          : null,
        bankGuarantee: emptyToNull(
          cell(row, headers, DBA_COLUMNS.bankGuarantee),
        ),
        passingDate: dateFields.passingDate.ok
          ? dateFields.passingDate.value
          : null,
        mortgageConfirmationDate: dateFields.mortgageConfirmationDate.ok
          ? dateFields.mortgageConfirmationDate.value
          : null,
        fee: feeValue,
        feeProcessingDate: dateFields.feeProcessingDate.ok
          ? dateFields.feeProcessingDate.value
          : null,
        offerExpiryDate: dateFields.offerExpiryDate.ok
          ? dateFields.offerExpiryDate.value
          : null,
        excelNotesSection: buildExcelNotesSection(
          emptyToNull(cell(row, headers, DBA_COLUMNS.status)),
          emptyToNull(cell(row, headers, DBA_COLUMNS.todo)),
        ),
        warnings,
      });
    }
  }

  return { ok: true, rows, issues };
}
