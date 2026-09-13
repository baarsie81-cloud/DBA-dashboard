export type MortgageDeadlineFilter =
  | "passing_14"
  | "conditions_14"
  | "offer_14"
  | "offer_expired";

export type MortgageSortField =
  | "customer_name"
  | "advisor"
  | "lender"
  | "principal"
  | "application_date"
  | "passing_date"
  | "financing_condition_date"
  | "offer_expiry_date"
  | "fee_processing_date";

export type MortgageSortDirection = "asc" | "desc";

export type MortgageListFilters = {
  search: string;
  advisorId: string | null;
  lenderId: string | null;
  deadline: MortgageDeadlineFilter | null;
  feeUnprocessed: boolean;
  sort: MortgageSortField;
  direction: MortgageSortDirection;
};

export type MortgageListParamDefaults = {
  sort: MortgageSortField;
  direction: MortgageSortDirection;
};

const SORT_FIELDS = new Set<MortgageSortField>([
  "customer_name",
  "advisor",
  "lender",
  "principal",
  "application_date",
  "passing_date",
  "financing_condition_date",
  "offer_expiry_date",
  "fee_processing_date",
]);

const DEADLINES = new Set<MortgageDeadlineFilter>([
  "passing_14",
  "conditions_14",
  "offer_14",
  "offer_expired",
]);

/** Fallback when no phase-specific defaults are known (in behandeling). */
export const DEFAULT_SORT: MortgageSortField = "passing_date";
export const DEFAULT_DIRECTION: MortgageSortDirection = "asc";

export const DEFAULT_LIST_PARAM_DEFAULTS: MortgageListParamDefaults = {
  sort: DEFAULT_SORT,
  direction: DEFAULT_DIRECTION,
};

export function parseMortgageListParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  defaults: MortgageListParamDefaults = DEFAULT_LIST_PARAM_DEFAULTS,
): MortgageListFilters {
  const get = (key: string): string => {
    if (params instanceof URLSearchParams) {
      return params.get(key)?.trim() ?? "";
    }
    const raw = params[key];
    if (Array.isArray(raw)) return raw[0]?.trim() ?? "";
    return raw?.trim() ?? "";
  };

  const sortRaw = get("sort");
  const directionRaw = get("direction");
  const deadlineRaw = get("deadline");
  const feeRaw = get("fee_unprocessed");

  return {
    search: get("q"),
    advisorId: get("advisor") || null,
    lenderId: get("lender") || null,
    deadline: DEADLINES.has(deadlineRaw as MortgageDeadlineFilter)
      ? (deadlineRaw as MortgageDeadlineFilter)
      : null,
    feeUnprocessed: feeRaw === "1" || feeRaw === "true",
    sort: SORT_FIELDS.has(sortRaw as MortgageSortField)
      ? (sortRaw as MortgageSortField)
      : defaults.sort,
    direction:
      directionRaw === "desc" || directionRaw === "asc"
        ? directionRaw
        : defaults.direction,
  };
}

export function hasActiveMortgageFilters(
  filters: MortgageListFilters,
): boolean {
  return Boolean(
    filters.search ||
      filters.advisorId ||
      filters.lenderId ||
      filters.deadline ||
      filters.feeUnprocessed,
  );
}

export function buildMortgageListHref(
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, string | null | undefined>,
  defaults: MortgageListParamDefaults = DEFAULT_LIST_PARAM_DEFAULTS,
): string {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }

  if (
    next.get("sort") === defaults.sort &&
    (next.get("direction") ?? defaults.direction) === defaults.direction
  ) {
    next.delete("sort");
    next.delete("direction");
  }

  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
