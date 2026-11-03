/** Fictional fixtures only. Run: npx tsx scripts/verify-mortgage-distribution.ts
 * --sql emits read-only CTE queries for execution against PostgreSQL, without tables/writes.
 */
import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/pg-proxy";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MortgageDistributionTables } from "../src/components/dashboard/MortgageDistributionTables";
import { buildMortgageDistribution, OTHER_MORTGAGE_CATEGORY } from "../src/lib/mortgage-distribution";
import { MORTGAGE_TYPE_OPTIONS } from "../src/lib/mortgage-type-options";
import { getMortgageDistribution } from "../src/db/queries/statistics";
import type { OverviewFilters } from "../src/lib/overview-params";
import type { Database } from "../src/db";

async function main() {
  const base = { lenderId: "a", lenderName: "Bank A", count: 1, principalTotal: 100.01, missingPrincipalCount: 0 };
  const inputs = [
    ...MORTGAGE_TYPE_OPTIONS.map((mortgageType) => ({ ...base, mortgageType })),
    { ...base, mortgageType: "Starter", count: 2, principalTotal: null, missingPrincipalCount: 2, lenderId: null, lenderName: null },
    ...["UEG", "verhogen", "starter", "Starter ", "Annuiteit", "Aflossingsvrij", "Oversluiter", "UEG / doorstromer", "", null].map((mortgageType) => ({ ...base, mortgageType })),
    { ...base, mortgageType: null, lenderId: "b", lenderName: "Bank B", principalTotal: 0 },
  ];
  const categories = buildMortgageDistribution(inputs);
  assert.deepEqual(categories.map((row) => row.category), [...MORTGAGE_TYPE_OPTIONS, OTHER_MORTGAGE_CATEGORY]);
  const starter = categories[0];
  assert.equal(starter.count, 3);
  assert.equal(starter.rows[0].lenderName, "Niet ingevuld");
  assert.equal(starter.rows[0].count, 2);
  assert.equal(starter.rows[0].principalTotal, null);
  assert.equal(starter.rows[0].percentage, 2 / 3 * 100);
  assert.equal(starter.rows[1].percentage, 1 / 3 * 100);
  assert.equal(starter.principalTotal, 100.01);
  assert.equal(starter.missingPrincipalCount, 2);
  const other = categories.at(-1)!;
  assert.equal(other.count, 11);
  assert.equal(other.rows.length, 2);
  assert.equal(other.principalTotal, 1000.10);
  assert.equal(other.rows[1].principalTotal, 0); // An entered zero stays an entered amount.
  assert.equal(categories.reduce((sum, row) => sum + row.count, 0), 19);
  for (const category of categories) {
    assert.equal(category.rows.reduce((sum, row) => sum + row.count, 0), category.count);
    assert.ok(Math.abs(category.rows.reduce((sum, row) => sum + row.percentage, 0) - 100) < 1e-9);
  }
  const empty = buildMortgageDistribution([]);
  assert.equal(empty.length, 7);
  assert.ok(empty.every((row) => row.count === 0 && row.principalTotal === null && row.rows.length === 0));
  const html = renderToStaticMarkup(createElement(MortgageDistributionTables, { categories, year: 2026, advisorName: "Testadviseur" }));
  assert.match(html, /2 bedragen ontbreken/);
  assert.match(html, /66,7/);
  assert.match(html, /Dossierjaar 2026/);
  assert.match(html, /fase- en geldverstrekkerfilters/);
  const emptyHtml = renderToStaticMarkup(createElement(MortgageDistributionTables, { categories: empty, year: null, advisorName: "Alle adviseurs" }));
  assert.equal((emptyHtml.match(/Geen dossiers voor deze selectie/g) ?? []).length, 1);
  assert.equal((html.match(/<option /g) ?? []).length, 7);
  assert.equal((html.match(/<table /g) ?? []).length, 1);
  assert.match(html, /<option value="Starter" selected="">Starter<\/option>/);
  assert.match(html, /Dossiers zonder dossierjaar tellen alleen mee bij Alle jaren/);
  assert.doesNotMatch(emptyHtml, />100%<|NaN|Infinity/);

  // Capture the actual Drizzle query via the existing lazy database slot.
  const queries: { name: string; sql: string }[] = [];
  let captured = { query: "", params: [] as unknown[] };
  const proxy = drizzle(async (query, params) => {
    captured = { query, params };
    return { rows: [] };
  });
  const globalDb = globalThis as unknown as { db?: Database };
  const previous = globalDb.db;
  globalDb.db = proxy as unknown as Database;
  const advisorA = "00000000-0000-0000-0000-000000000001";
  const advisorB = "00000000-0000-0000-0000-000000000002";
  const lenderA = "00000000-0000-0000-0000-000000000011";
  const lenderB = "00000000-0000-0000-0000-000000000012";
  const fixtures = `WITH mortgage_cases(id, mortgage_type, lender_id, principal_amount, phase, dossier_year) AS (VALUES
    (1, 'Starter', '${lenderA}'::uuid, 100.01::numeric, 'in_behandeling', 2026),
    (2, 'Starter', '${lenderB}'::uuid, 200.02::numeric, 'afgehandeld', 2026),
    (3, 'Starter', '${lenderA}'::uuid, 999::numeric, 'prospect', 2026),
    (4, 'Starter', '${lenderA}'::uuid, 999::numeric, 'geannuleerd', 2026),
    (5, 'Doorstromer', NULL::uuid, NULL::numeric, 'afgehandeld', 2027),
    (6, NULL, NULL::uuid, NULL::numeric, 'in_behandeling', NULL::integer),
    (7, 'UEG', '${lenderA}'::uuid, 0::numeric, 'afgehandeld', 2026),
    (8, 'Ophoger', '${lenderB}'::uuid, 300.03::numeric, 'in_behandeling', 2026),
    (9, 'Uit Elkaar Gaan', '${lenderA}'::uuid, 400.04::numeric, 'afgehandeld', 2026),
    (10, 'Familie', '${lenderA}'::uuid, 500.05::numeric, 'afgehandeld', 2026),
    (11, 'Zakelijk', '${lenderB}'::uuid, 600.06::numeric, 'in_behandeling', 2026),
    (12, 'Starter', '${lenderA}'::uuid, 500.05::numeric, 'afgehandeld', 2027)
  ), lenders(id, name) AS (VALUES ('${lenderA}'::uuid, 'Bank A'), ('${lenderB}'::uuid, 'Bank B')),
  mortgage_case_advisors(mortgage_case_id, advisor_id) AS (VALUES (1, '${advisorA}'::uuid), (1, '${advisorB}'::uuid), (2, '${advisorB}'::uuid), (5, '${advisorA}'::uuid))`;
  const baseFilters: OverviewFilters = { year: null, advisorId: null, phase: null, lenderId: null };
  try {
    for (const [name, filters] of Object.entries({
      all: baseFilters,
      ignoredFilters: { ...baseFilters, phase: "prospect" as const, lenderId: lenderA },
      year: { ...baseFilters, year: 2026 },
      year2027: { ...baseFilters, year: 2027 },
      year2029: { ...baseFilters, year: 2029 },
      year2030: { ...baseFilters, year: 2030 },
      advisor: { ...baseFilters, advisorId: advisorA },
      yearAdvisor: { ...baseFilters, year: 2026, advisorId: advisorB },
      empty: { ...baseFilters, year: 2028 },
    })) {
      await getMortgageDistribution(filters);
      const query = captured.query.replace(/\$(\d+)/g, (_, index) => {
        const value = captured.params[Number(index) - 1];
        return typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
      });
      queries.push({ name, sql: `${fixtures} ${query}` });
    }
  } finally {
    globalDb.db = previous;
  }
  assert.equal(queries[0].sql, queries[1].sql);
  if (process.argv.includes("--sql")) {
    process.stdout.write(JSON.stringify(queries));
  } else {
    console.log("verify-mortgage-distribution: OK (categories, percentages, sums, missing values, empty states, rendering and query generation)");
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
