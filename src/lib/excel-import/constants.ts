import type { MortgagePhase } from "@/db/schema";

/** Required worksheet names in the fixed DBA mortgage workbook. */
export const DBA_SHEETS = [
  "Prospects",
  "In behandeling",
  "Geannuleerd",
  "Afgehandeld",
] as const;

export type DbaSheetName = (typeof DBA_SHEETS)[number];

export const SHEET_TO_PHASE: Record<DbaSheetName, MortgagePhase> = {
  Prospects: "prospect",
  "In behandeling": "in_behandeling",
  Geannuleerd: "geannuleerd",
  Afgehandeld: "afgehandeld",
};

/**
 * Fixed DBA column headers from the existing workbook format.
 * "Offerte vervaldatum" is optional when absent from a sheet.
 */
export const DBA_COLUMNS = {
  lastName: "Achternaam",
  initials: "Voorletter(s)",
  infix: "Tussenvoegsels",
  advisor: "Adviseur",
  mortgageType: "Type",
  applicationDate: "Datum aanvraag",
  lender: "Geldverstrekker",
  principalAmount: "Hoofdsom",
  lastCheckDate: "Laatste check",
  financingConditionDate: "Datum ontb. vw",
  guaranteeDate: "Datum BG / WBS",
  bankGuarantee: "BG / WBS",
  passingDate: "Passeerdatum",
  status: "Status",
  todo: "To do",
  mortgageConfirmationDate: "Datum bevestiging hypotheek",
  fee: "Tarief",
  feeProcessingDate: "Verwerking vergoeding",
  offerExpiryDate: "Offerte vervaldatum",
} as const;

export const REQUIRED_COLUMNS: string[] = [
  DBA_COLUMNS.lastName,
  DBA_COLUMNS.initials,
  DBA_COLUMNS.infix,
  DBA_COLUMNS.advisor,
  DBA_COLUMNS.mortgageType,
  DBA_COLUMNS.applicationDate,
  DBA_COLUMNS.lender,
  DBA_COLUMNS.principalAmount,
  DBA_COLUMNS.lastCheckDate,
  DBA_COLUMNS.financingConditionDate,
  DBA_COLUMNS.guaranteeDate,
  DBA_COLUMNS.bankGuarantee,
  DBA_COLUMNS.passingDate,
  DBA_COLUMNS.status,
  DBA_COLUMNS.todo,
  DBA_COLUMNS.mortgageConfirmationDate,
  DBA_COLUMNS.fee,
  DBA_COLUMNS.feeProcessingDate,
];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Real DBA workbooks place the column headers on Excel row 6.
 * Rows 1–5 contain title/legend/spacer lines and must be ignored.
 */
export const DBA_HEADER_ROW_NUMBER = 6;

export const FORMAT_ERROR_MESSAGE =
  "Dit bestand komt niet overeen met het vaste DBA hypotheekoverzicht.";

/**
 * Explicit Excel advisor label → canonical advisor name.
 * No fuzzy matching — aliases plus exact case-insensitive DB names only.
 */
export const ADVISOR_ALIASES: Record<string, string> = {
  "rene de boer": "René de Boer",
  "rené de boer": "René de Boer",
  rdb: "René de Boer",
  "r. de boer": "René de Boer",
  "r.de boer": "René de Boer",
  "sanne jansen": "Sanne Jansen",
  sj: "Sanne Jansen",
  "s. jansen": "Sanne Jansen",
  "marco visser": "Marco Visser",
  mv: "Marco Visser",
  "m. visser": "Marco Visser",
};

export const EXCEL_NOTES_MARKER = "[Excel-import]";
export const DASHBOARD_NOTES_MARKER = "[Dashboardnotities]";
