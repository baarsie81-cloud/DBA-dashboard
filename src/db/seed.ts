import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  advisors,
  dashboardSettings,
  lenders,
  mortgageCaseAdvisors,
  mortgageCases,
} from "./schema";

async function seed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run the seed script.");
  }

  const client = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(client);

  console.log("Seeding database...");

  await db.delete(mortgageCases);
  await db.delete(dashboardSettings);
  await db.delete(advisors);
  await db.delete(lenders);

  const insertedAdvisors = await db
    .insert(advisors)
    .values([
      { name: "René de Boer" },
      { name: "Sanne Jansen" },
      { name: "Marco Visser" },
    ])
    .returning();

  const insertedLenders = await db
    .insert(lenders)
    .values([
      { name: "Rabobank" },
      { name: "ING" },
      { name: "ABN AMRO" },
      { name: "Nationale-Nederlanden" },
      { name: "Obvion" },
    ])
    .returning();

  const byAdvisor = Object.fromEntries(
    insertedAdvisors.map((advisor) => [advisor.name, advisor.id]),
  );
  const byLender = Object.fromEntries(
    insertedLenders.map((lender) => [lender.name, lender.id]),
  );

  const insertedCases = await db
    .insert(mortgageCases)
    .values([
      {
        customerName: "Jansen, T.",
        lenderId: byLender["Rabobank"],
        mortgageType: "Annuïteit",
        applicationDate: "2026-08-12",
        principalAmount: "450000.00",
        lastCheckDate: "2026-09-01",
        financingConditionDate: "2026-09-28",
        bankGuarantee: "Aangevraagd",
        guaranteeDate: "2026-09-05",
        passingDate: "2026-10-15",
        mortgageConfirmationDate: "2026-09-10",
        fee: "2750.00",
        notes: "Wacht op taxatierapport.",
        phase: "in_behandeling",
      },
      {
        customerName: "de Vries, M.",
        lenderId: byLender["ING"],
        mortgageType: "Lineair",
        applicationDate: "2026-08-05",
        principalAmount: "325000.00",
        lastCheckDate: "2026-08-28",
        financingConditionDate: "2026-09-20",
        bankGuarantee: "Nee",
        guaranteeDate: null,
        passingDate: "2026-10-10",
        mortgageConfirmationDate: null,
        fee: "2450.00",
        notes: null,
        phase: "in_behandeling",
      },
      {
        customerName: "van Dijk, R.",
        lenderId: byLender["ABN AMRO"],
        mortgageType: "Annuïteit",
        applicationDate: "2026-08-03",
        principalAmount: "520000.00",
        lastCheckDate: "2026-09-05",
        financingConditionDate: "2026-09-18",
        bankGuarantee: "Ja",
        guaranteeDate: "2026-08-20",
        passingDate: "2026-09-24",
        mortgageConfirmationDate: "2026-09-01",
        fee: "3100.00",
        notes: "Passeerdatum dichtbij. Gezamenlijk dossier.",
        phase: "in_behandeling",
      },
      {
        customerName: "Bakker, L.",
        lenderId: byLender["Obvion"],
        mortgageType: "Annuïteit",
        applicationDate: "2026-09-02",
        principalAmount: "275000.00",
        lastCheckDate: null,
        financingConditionDate: null,
        bankGuarantee: null,
        guaranteeDate: null,
        passingDate: null,
        mortgageConfirmationDate: null,
        fee: "2200.00",
        notes: "Eerste intake gepland.",
        phase: "prospect",
      },
      {
        customerName: "Meijer, S.",
        lenderId: byLender["Nationale-Nederlanden"],
        mortgageType: "Aflossingsvrij / annuïteit",
        applicationDate: "2026-09-08",
        principalAmount: "410000.00",
        lastCheckDate: null,
        financingConditionDate: null,
        bankGuarantee: null,
        guaranteeDate: null,
        passingDate: null,
        mortgageConfirmationDate: null,
        fee: "2600.00",
        notes: "Oriëntatie op overwaarde.",
        phase: "prospect",
      },
      {
        customerName: "Smit, K.",
        lenderId: byLender["Rabobank"],
        mortgageType: "Annuïteit",
        applicationDate: "2026-06-10",
        principalAmount: "680000.00",
        lastCheckDate: "2026-07-01",
        financingConditionDate: "2026-07-15",
        bankGuarantee: "Nee",
        guaranteeDate: null,
        passingDate: null,
        mortgageConfirmationDate: null,
        fee: "0.00",
        notes: "Klant heeft aankoop geannuleerd.",
        phase: "geannuleerd",
      },
      {
        customerName: "Mulder, A.",
        lenderId: byLender["ING"],
        mortgageType: "Lineair",
        applicationDate: "2026-05-20",
        principalAmount: "295000.00",
        lastCheckDate: "2026-06-12",
        financingConditionDate: "2026-06-30",
        bankGuarantee: "Ja",
        guaranteeDate: "2026-06-01",
        passingDate: null,
        mortgageConfirmationDate: null,
        fee: "1800.00",
        notes: "Gestopt na afwijzing werkgeversverklaring.",
        phase: "geannuleerd",
      },
      {
        customerName: "de Boer, P.",
        lenderId: byLender["ABN AMRO"],
        mortgageType: "Annuïteit",
        applicationDate: "2026-03-14",
        principalAmount: "385000.00",
        lastCheckDate: "2026-04-20",
        financingConditionDate: "2026-04-28",
        bankGuarantee: "Ja",
        guaranteeDate: "2026-04-05",
        passingDate: "2026-05-16",
        mortgageConfirmationDate: "2026-04-22",
        fee: "2550.00",
        notes: "Gepasseerd bij notaris Utrecht.",
        phase: "afgehandeld",
      },
      {
        customerName: "Visser, H.",
        lenderId: byLender["Nationale-Nederlanden"],
        mortgageType: "Annuïteit",
        applicationDate: "2026-02-02",
        principalAmount: "540000.00",
        lastCheckDate: "2026-03-01",
        financingConditionDate: "2026-03-10",
        bankGuarantee: "Nee",
        guaranteeDate: null,
        passingDate: "2026-03-28",
        mortgageConfirmationDate: "2026-03-15",
        fee: "3200.00",
        notes: null,
        phase: "afgehandeld",
      },
      {
        customerName: "Peters, N.",
        lenderId: byLender["Obvion"],
        mortgageType: "Lineair",
        applicationDate: "2026-01-18",
        principalAmount: "370000.00",
        lastCheckDate: "2026-02-10",
        financingConditionDate: "2026-02-20",
        bankGuarantee: "Ja",
        guaranteeDate: "2026-02-01",
        passingDate: "2026-03-05",
        mortgageConfirmationDate: "2026-02-18",
        fee: "2400.00",
        notes: "Doorverwezen door bestaande klant.",
        phase: "afgehandeld",
      },
    ])
    .returning();

  const byCustomer = Object.fromEntries(
    insertedCases.map((row) => [row.customerName, row.id]),
  );

  await db.insert(mortgageCaseAdvisors).values([
    {
      mortgageCaseId: byCustomer["Jansen, T."],
      advisorId: byAdvisor["René de Boer"],
    },
    {
      mortgageCaseId: byCustomer["de Vries, M."],
      advisorId: byAdvisor["Sanne Jansen"],
    },
    // Shared dossier: René + Marco
    {
      mortgageCaseId: byCustomer["van Dijk, R."],
      advisorId: byAdvisor["René de Boer"],
    },
    {
      mortgageCaseId: byCustomer["van Dijk, R."],
      advisorId: byAdvisor["Marco Visser"],
    },
    {
      mortgageCaseId: byCustomer["Bakker, L."],
      advisorId: byAdvisor["René de Boer"],
    },
    {
      mortgageCaseId: byCustomer["Meijer, S."],
      advisorId: byAdvisor["Sanne Jansen"],
    },
    {
      mortgageCaseId: byCustomer["Smit, K."],
      advisorId: byAdvisor["Marco Visser"],
    },
    {
      mortgageCaseId: byCustomer["Mulder, A."],
      advisorId: byAdvisor["René de Boer"],
    },
    {
      mortgageCaseId: byCustomer["de Boer, P."],
      advisorId: byAdvisor["Sanne Jansen"],
    },
    {
      mortgageCaseId: byCustomer["Visser, H."],
      advisorId: byAdvisor["Marco Visser"],
    },
    {
      mortgageCaseId: byCustomer["Peters, N."],
      advisorId: byAdvisor["René de Boer"],
    },
  ]);

  await db.insert(dashboardSettings).values([
    {
      key: "mortgage_table_column_order",
      value: JSON.stringify([
        "customer_name",
        "advisor",
        "lender",
        "principal_amount",
        "application_date",
        "financing_condition_date",
        "passing_date",
        "offer_expiry_date",
        "phase",
      ]),
    },
  ]);

  console.log(
    `Seed complete: ${insertedAdvisors.length} advisors, ${insertedLenders.length} lenders, ${insertedCases.length} mortgage cases.`,
  );

  await client.end();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
