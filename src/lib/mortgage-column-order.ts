import type { MortgageSortField } from "@/lib/mortgage-list-params";

export const MORTGAGE_COLUMN_KEYS = [
  "customer_name",
  "advisor",
  "lender",
  "svn",
  "principal_amount",
  "application_date",
  "financing_condition_date",
  "passing_date",
  "ready_for_passing",
  "offer_expiry_date",
  "fee_processing_date",
  "phase",
] as const;

export type MortgageColumnKey = (typeof MORTGAGE_COLUMN_KEYS)[number];

export const DEFAULT_MORTGAGE_COLUMN_ORDER: MortgageColumnKey[] = [
  ...MORTGAGE_COLUMN_KEYS,
];

export const MORTGAGE_COLUMN_ORDER_SETTING_KEY = "mortgage_table_column_order";

const KNOWN_KEYS = new Set<string>(MORTGAGE_COLUMN_KEYS);

/** Preferred insertion anchors for newly added known columns. */
const COLUMN_INSERT_AFTER: Partial<
  Record<MortgageColumnKey, MortgageColumnKey>
> = {
  svn: "lender",
  ready_for_passing: "passing_date",
};

const LEGACY_KEY_MAP: Record<string, MortgageColumnKey> = {
  advisor_id: "advisor",
  lender_id: "lender",
  principal: "principal_amount",
  customerName: "customer_name",
  applicationDate: "application_date",
  financingConditionDate: "financing_condition_date",
  passingDate: "passing_date",
  offerExpiryDate: "offer_expiry_date",
  feeProcessingDate: "fee_processing_date",
};

export type MortgageColumnMeta = {
  key: MortgageColumnKey;
  label: string;
  align?: "left" | "right";
  sortField?: MortgageSortField;
};

export const MORTGAGE_COLUMN_META: Record<
  MortgageColumnKey,
  MortgageColumnMeta
> = {
  customer_name: {
    key: "customer_name",
    label: "Klantnaam",
    sortField: "customer_name",
  },
  advisor: {
    key: "advisor",
    label: "Adviseur",
    sortField: "advisor",
  },
  lender: {
    key: "lender",
    label: "Geldverstrekker",
    sortField: "lender",
  },
  svn: {
    key: "svn",
    label: "SVN",
  },
  principal_amount: {
    key: "principal_amount",
    label: "Hoofdsom",
    align: "right",
    sortField: "principal",
  },
  application_date: {
    key: "application_date",
    label: "Datum aanvraag",
    sortField: "application_date",
  },
  financing_condition_date: {
    key: "financing_condition_date",
    label: "Ontbindende v.",
    sortField: "financing_condition_date",
  },
  passing_date: {
    key: "passing_date",
    label: "Passeerdatum",
    sortField: "passing_date",
  },
  ready_for_passing: {
    key: "ready_for_passing",
    label: "Passeren",
  },
  offer_expiry_date: {
    key: "offer_expiry_date",
    label: "Offerte vervalt",
    sortField: "offer_expiry_date",
  },
  fee_processing_date: {
    key: "fee_processing_date",
    label: "Verwerking vergoeding",
    sortField: "fee_processing_date",
  },
  phase: {
    key: "phase",
    label: "Fase",
  },
};

function resolveKey(raw: unknown): MortgageColumnKey | null {
  if (typeof raw !== "string") return null;
  if (KNOWN_KEYS.has(raw)) return raw as MortgageColumnKey;
  return LEGACY_KEY_MAP[raw] ?? null;
}

function insertMissingColumn(
  ordered: MortgageColumnKey[],
  seen: Set<MortgageColumnKey>,
  key: MortgageColumnKey,
) {
  if (seen.has(key)) return;

  const after = COLUMN_INSERT_AFTER[key];
  if (after) {
    const index = ordered.indexOf(after);
    if (index >= 0) {
      ordered.splice(index + 1, 0, key);
      seen.add(key);
      return;
    }
  }

  ordered.push(key);
  seen.add(key);
}

export function normalizeMortgageColumnOrder(
  input: unknown,
): MortgageColumnKey[] {
  const ordered: MortgageColumnKey[] = [];
  const seen = new Set<MortgageColumnKey>();

  if (Array.isArray(input)) {
    for (const item of input) {
      const key = resolveKey(item);
      if (!key || seen.has(key)) continue;
      ordered.push(key);
      seen.add(key);
    }
  }

  for (const key of MORTGAGE_COLUMN_KEYS) {
    insertMissingColumn(ordered, seen, key);
  }

  return ordered.length > 0 ? ordered : [...DEFAULT_MORTGAGE_COLUMN_ORDER];
}

export function parseMortgageColumnOrderJson(
  raw: string | null | undefined,
): MortgageColumnKey[] {
  if (raw == null || raw.trim() === "") {
    return [...DEFAULT_MORTGAGE_COLUMN_ORDER];
  }

  try {
    return normalizeMortgageColumnOrder(JSON.parse(raw));
  } catch {
    return [...DEFAULT_MORTGAGE_COLUMN_ORDER];
  }
}
