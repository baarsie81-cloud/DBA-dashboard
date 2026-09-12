import {
  boolean,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
    advisorId: uuid("advisor_id").references(() => advisors.id, {
      onDelete: "restrict",
    }),
    mortgageType: text("mortgage_type"),
    applicationDate: date("application_date"),
    lenderId: uuid("lender_id").references(() => lenders.id, {
      onDelete: "restrict",
    }),
    principalAmount: numeric("principal_amount", { precision: 14, scale: 2 }),
    lastCheckDate: date("last_check_date"),
    financingConditionDate: date("financing_condition_date"),
    bankGuarantee: text("bank_guarantee"),
    passingDate: date("passing_date"),
    mortgageConfirmation: text("mortgage_confirmation"),
    fee: numeric("fee", { precision: 12, scale: 2 }),
    notes: text("notes"),
    phase: mortgagePhaseEnum("phase").notNull().default("prospect"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("mortgage_cases_phase_idx").on(table.phase),
    index("mortgage_cases_advisor_id_idx").on(table.advisorId),
    index("mortgage_cases_lender_id_idx").on(table.lenderId),
    index("mortgage_cases_passing_date_idx").on(table.passingDate),
    index("mortgage_cases_financing_condition_date_idx").on(
      table.financingConditionDate,
    ),
    index("mortgage_cases_application_date_idx").on(table.applicationDate),
  ],
);

/** Generic key/value store for dashboard preferences (e.g. column order). */
export const dashboardSettings = pgTable("dashboard_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Advisor = typeof advisors.$inferSelect;
export type Lender = typeof lenders.$inferSelect;
export type MortgageCase = typeof mortgageCases.$inferSelect;
export type DashboardSetting = typeof dashboardSettings.$inferSelect;
