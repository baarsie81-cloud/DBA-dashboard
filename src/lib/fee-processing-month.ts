/** Fee processing is stored as date (first day of month); UI is month+year. */

const MONTH_LABELS_NL = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
] as const;

const FEE_YEAR_START = 2026;
const FEE_YEAR_END = 2030;

export type FeeProcessingMonthOption = {
  /** ISO date stored in fee_processing_date: YYYY-MM-01 */
  value: string;
  label: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Compact select options: Januari 2026 … December 2030. */
export function feeProcessingMonthOptions(): FeeProcessingMonthOption[] {
  const options: FeeProcessingMonthOption[] = [];
  for (let year = FEE_YEAR_START; year <= FEE_YEAR_END; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      options.push({
        value: `${year}-${pad2(month)}-01`,
        label: `${MONTH_LABELS_NL[month - 1]} ${year}`,
      });
    }
  }
  return options;
}

/** Normalize any ISO date to the first day of that month. */
export function toMonthStartIso(isoDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  const normalized = `${year}-${pad2(month)}-01`;
  if (Number.isNaN(new Date(`${normalized}T00:00:00`).getTime())) return null;
  return normalized;
}

/**
 * Value for the month select. Out-of-range months still produce a value so
 * the select can show a temporary legacy option.
 */
export function feeProcessingMonthValue(
  raw: string | Date | null | undefined,
): string {
  if (raw == null || raw === "") return "";
  const iso =
    raw instanceof Date
      ? raw.toISOString().slice(0, 10)
      : String(raw).slice(0, 10);
  return toMonthStartIso(iso) ?? "";
}

export function feeProcessingMonthSelectOptions(
  currentIso: string | Date | null | undefined,
): FeeProcessingMonthOption[] {
  const options = feeProcessingMonthOptions();
  const current = feeProcessingMonthValue(currentIso);
  if (!current) return options;
  if (options.some((option) => option.value === current)) return options;

  const year = Number(current.slice(0, 4));
  const month = Number(current.slice(5, 7));
  const label =
    month >= 1 && month <= 12
      ? `${MONTH_LABELS_NL[month - 1]} ${year} (bestaand)`
      : `${current} (bestaand)`;

  return [{ value: current, label }, ...options];
}

/** Table display: "januari 2026". */
export function formatFeeProcessingMonth(
  isoDate: string | null | undefined,
): string {
  if (!isoDate) return "—";
  const start = toMonthStartIso(isoDate.slice(0, 10));
  if (!start) return "—";
  const year = Number(start.slice(0, 4));
  const month = Number(start.slice(5, 7));
  const label = MONTH_LABELS_NL[month - 1];
  if (!label) return "—";
  return `${label.toLowerCase()} ${year}`;
}

/**
 * Parse form month select (YYYY-MM-01) or empty.
 * Accepts out-of-range legacy month values when already stored.
 */
export function parseFeeProcessingMonthInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false } {
  if (raw == null || raw.trim() === "") return { ok: true, value: null };
  const normalized = toMonthStartIso(raw.trim());
  if (!normalized) return { ok: false };
  return { ok: true, value: normalized };
}
