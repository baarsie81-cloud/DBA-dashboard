import * as XLSX from "xlsx";
import type { MortgagePhase } from "@/db/schema";
import {
  DBA_COLUMNS,
  DBA_HEADER_ROW_NUMBER,
  DBA_SHEETS,
  FORMAT_ERROR_MESSAGE,
  REQUIRED_COLUMNS,
  SHEET_TO_PHASE,
  type DbaSheetName,
} from "./constants";
import {
  buildExcelNotesSection,
  buildLegacyImportKey,
  emptyToNull,
  parseExcelAmount,
  parseExcelDate,
  splitAdvisorLabels,
} from "./normalize";
import {
  buildLegacyCustomerNameFromKlant1,
  cleanNamePart,
  combineExcelLastName,
} from "@/lib/customer-name";
import { normalizeBankGuaranteeFromExcel } from "@/lib/bank-guarantee-options";
import { toMonthStartIso } from "@/lib/fee-processing-month";

export type ParsedImportRow = {
  sheet: DbaSheetName;
  excelRowNumber: number;
  phase: MortgagePhase;
  legacyImportKey: string;
  /** Legacy display string built from Klant 1 only. */
  customerName: string;
  customer1LastName: string;
  customer1Initials: string | null;
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
    const sheetRef = sheet["!ref"];
    if (!sheetRef) {
      return { ok: false, message: FORMAT_ERROR_MESSAGE };
    }

    const range = XLSX.utils.decode_range(sheetRef);
    const headerRowIndex0 = DBA_HEADER_ROW_NUMBER - 1;
    if (range.e.r < headerRowIndex0) {
      return { ok: false, message: FORMAT_ERROR_MESSAGE };
    }

    // Keep blank rows so matrix indexes stay aligned with Excel row numbers.
    const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(
      sheet,
      {
        header: 1,
        raw: true,
        defval: null,
        blankrows: true,
      },
    );

    // sheet_to_json starts at range.s.r; map absolute Excel row 6 into the matrix.
    const headerMatrixIndex = headerRowIndex0 - range.s.r;
    if (headerMatrixIndex < 0 || headerMatrixIndex >= matrix.length) {
      return { ok: false, message: FORMAT_ERROR_MESSAGE };
    }

    const headers = headerIndexMap(matrix[headerMatrixIndex] ?? []);
    if (REQUIRED_COLUMNS.some((column) => !headers.has(column))) {
      return { ok: false, message: FORMAT_ERROR_MESSAGE };
    }

    const hasOfferExpiry = headers.has(DBA_COLUMNS.offerExpiryDate);
    const phase = SHEET_TO_PHASE[sheetName];

    // Header-only sheets (row 6 headers, no data rows) are valid.
    for (let i = headerMatrixIndex + 1; i < matrix.length; i += 1) {
      const excelRowNumber = range.s.r + i + 1;
      const row = matrix[i] ?? [];
      if (isRowEmpty(row)) continue;

      const warnings: string[] = [];
      const lastName = emptyToNull(cell(row, headers, DBA_COLUMNS.lastName));
      const initials = cleanNamePart(
        emptyToNull(cell(row, headers, DBA_COLUMNS.initials)),
      );
      const infix = emptyToNull(cell(row, headers, DBA_COLUMNS.infix));
      const customer1LastName = combineExcelLastName(lastName, infix);
      const customerLabel =
        buildLegacyCustomerNameFromKlant1(customer1LastName, initials) ||
        lastName ||
        `Rij ${excelRowNumber}`;

      if (!lastName || !customer1LastName) {
        issues.push({
          sheet: sheetName,
          excelRowNumber,
          customerLabel,
          reason: "Achternaam ontbreekt.",
        });
        continue;
      }

      const customerName = buildLegacyCustomerNameFromKlant1(
        customer1LastName,
        initials,
      );
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

      const feeProcessingRaw = dateFields.feeProcessingDate.ok
        ? dateFields.feeProcessingDate.value
        : null;
      const feeProcessingDate =
        feeProcessingRaw != null
          ? (toMonthStartIso(feeProcessingRaw) ?? feeProcessingRaw)
          : null;

      rows.push({
        sheet: sheetName,
        excelRowNumber,
        phase,
        legacyImportKey: buildLegacyImportKey({
          sheetName,
          excelRowNumber,
        }),
        customerName,
        customer1LastName,
        customer1Initials: initials,
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
        bankGuarantee: normalizeBankGuaranteeFromExcel(
          emptyToNull(cell(row, headers, DBA_COLUMNS.bankGuarantee)),
        ),
        passingDate: dateFields.passingDate.ok
          ? dateFields.passingDate.value
          : null,
        mortgageConfirmationDate: dateFields.mortgageConfirmationDate.ok
          ? dateFields.mortgageConfirmationDate.value
          : null,
        fee: feeValue,
        feeProcessingDate,
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
