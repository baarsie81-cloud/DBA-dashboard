import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const mortgagePhaseEnum = pgEnum("mortgage_phase", [
  "prospect",
  "in_behandeling",
  "geannuleerd",
  "afgehandeld",
]);

export const advisors = pgTable("advisors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lenders = pgTable("lenders", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mortgageCases = pgTable(
  "mortgage_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerName: text("customer_name").notNull(),
    mortgageType: text("mortgage_type"),
    applicationDate: date("application_date"),
    lenderId: uuid("lender_id").references(() => lenders.id, {
      onDelete: "restrict",
    }),
    principalAmount: numeric("principal_amount", { precision: 14, scale: 2 }),
    lastCheckDate: date("last_check_date"),
    financingConditionDate: date("financing_condition_date"),
    bankGuarantee: text("bank_guarantee"),
    guaranteeDate: date("guarantee_date"),
    passingDate: date("passing_date"),
    offerExpiryDate: date("offer_expiry_date"),
    mortgageConfirmationDate: date("mortgage_confirmation_date"),
    fee: numeric("fee", { precision: 12, scale: 2 }),
    feeProcessingDate: date("fee_processing_date"),
    notes: text("notes"),
    /** Deterministic key for DBA Excel re-import; null for manually created cases. */
    legacyImportKey: text("legacy_import_key"),
    phase: mortgagePhaseEnum("phase").notNull().default("prospect"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("mortgage_cases_phase_idx").on(table.phase),
    index("mortgage_cases_lender_id_idx").on(table.lenderId),
    index("mortgage_cases_passing_date_idx").on(table.passingDate),
    index("mortgage_cases_financing_condition_date_idx").on(
      table.financingConditionDate,
    ),
    index("mortgage_cases_offer_expiry_date_idx").on(table.offerExpiryDate),
    index("mortgage_cases_application_date_idx").on(table.applicationDate),
    index("mortgage_cases_guarantee_date_idx").on(table.guaranteeDate),
    index("mortgage_cases_mortgage_confirmation_date_idx").on(
      table.mortgageConfirmationDate,
    ),
    index("mortgage_cases_fee_processing_date_idx").on(table.feeProcessingDate),
    uniqueIndex("mortgage_cases_legacy_import_key_uidx").on(table.legacyImportKey),
  ],
);

/** Many-to-many: one mortgage case can have multiple advisors. */
export const mortgageCaseAdvisors = pgTable(
  "mortgage_case_advisors",
  {
    mortgageCaseId: uuid("mortgage_case_id")
      .notNull()
      .references(() => mortgageCases.id, { onDelete: "cascade" }),
    advisorId: uuid("advisor_id")
      .notNull()
      .references(() => advisors.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.mortgageCaseId, table.advisorId],
      name: "mortgage_case_advisors_pk",
    }),
    index("mortgage_case_advisors_advisor_id_idx").on(table.advisorId),
  ],
);

/** Generic key/value store for dashboard preferences (e.g. column order). */
export const dashboardSettings = pgTable("dashboard_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});


/** Lightweight log of executed Excel imports. */
export const excelImports = pgTable("excel_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  filename: text("filename").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  totalRows: integer("total_rows").notNull(),
  newCount: integer("new_count").notNull(),
  updatedCount: integer("updated_count").notNull(),
  unchangedCount: integer("unchanged_count").notNull(),
  errorCount: integer("error_count").notNull(),
});

export type Advisor = typeof advisors.$inferSelect;
export type Lender = typeof lenders.$inferSelect;
export type MortgageCase = typeof mortgageCases.$inferSelect;
export type MortgageCaseAdvisor = typeof mortgageCaseAdvisors.$inferSelect;
export type DashboardSetting = typeof dashboardSettings.$inferSelect;
export type ExcelImport = typeof excelImports.$inferSelect;
export type MortgagePhase = (typeof mortgagePhaseEnum.enumValues)[number];
