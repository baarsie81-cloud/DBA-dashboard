/**
 * Short helper check: overview year filter uses dossier_year only.
 * Run: npx tsx scripts/verify-overview-dossier-year.ts
 */
import { DOSSIER_YEAR_OPTIONS } from "../src/lib/dossier-year";
import {
  matchesOverviewDossierYear,
  parseOverviewParams,
} from "../src/lib/overview-params";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// year=2026 → only dossier_year 2026
assert(matchesOverviewDossierYear(2026, 2026), "2026 matches 2026");
assert(!matchesOverviewDossierYear(2027, 2026), "2027 does not match 2026");
assert(!matchesOverviewDossierYear(null, 2026), "null excluded from 2026");

// year=2027 → only dossier_year 2027
assert(matchesOverviewDossierYear(2027, 2027), "2027 matches 2027");
assert(!matchesOverviewDossierYear(2026, 2027), "2026 does not match 2027");
assert(!matchesOverviewDossierYear(null, 2027), "null excluded from 2027");

// Alle jaren → null + all years allowed
assert(matchesOverviewDossierYear(null, null), "null included in Alle jaren");
for (const year of DOSSIER_YEAR_OPTIONS) {
  assert(
    matchesOverviewDossierYear(year, null),
    `${year} included in Alle jaren`,
  );
}

// URL param parsing accepts fixed options only
assert(parseOverviewParams({ year: "2026" }).year === 2026, "parse 2026");
assert(parseOverviewParams({ year: "2027" }).year === 2027, "parse 2027");
assert(parseOverviewParams({ year: "" }).year === null, "parse empty → Alle jaren");
assert(parseOverviewParams({}).year === null, "parse missing → Alle jaren");
assert(parseOverviewParams({ year: "2019" }).year === null, "reject out-of-range");
assert(
  parseOverviewParams({ year: "not-a-year" }).year === null,
  "reject non-integer",
);

console.log("verify-overview-dossier-year: OK");
