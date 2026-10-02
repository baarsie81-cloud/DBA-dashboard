/**
 * Short helper check: fee omzet counting rules.
 * Run: npx tsx scripts/verify-fee-omzet-helpers.ts
 */

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

type Case = {
  id: string;
  fee: number | null;
  phase: "in_behandeling" | "afgehandeld" | "prospect";
  advisorIds: string[];
};

/** Organisation: one row per case (ignore null fees in sums). */
function organisationFeeTotals(cases: Case[]) {
  let inProgress = 0;
  let completed = 0;
  let total = 0;
  for (const row of cases) {
    if (row.fee == null) continue;
    total += row.fee;
    if (row.phase === "in_behandeling") inProgress += row.fee;
    if (row.phase === "afgehandeld") completed += row.fee;
  }
  return { inProgress, completed, total };
}

/** Advisor: shared dossier counts fully for each advisor. */
function advisorFeeTotals(cases: Case[], advisorId: string) {
  let inProgress = 0;
  let completed = 0;
  let total = 0;
  for (const row of cases) {
    if (!row.advisorIds.includes(advisorId)) continue;
    if (row.fee == null) continue;
    total += row.fee;
    if (row.phase === "in_behandeling") inProgress += row.fee;
    if (row.phase === "afgehandeld") completed += row.fee;
  }
  return { inProgress, completed, total };
}

const cases: Case[] = [
  {
    id: "shared",
    fee: 3000,
    phase: "afgehandeld",
    advisorIds: ["django", "rene"],
  },
  {
    id: "solo",
    fee: 2000,
    phase: "in_behandeling",
    advisorIds: ["django"],
  },
  {
    id: "null-fee",
    fee: null,
    phase: "in_behandeling",
    advisorIds: ["django", "rene"],
  },
];

const org = organisationFeeTotals(cases);
assert(org.total === 5000, "org total once");
assert(org.inProgress === 2000, "org in progress");
assert(org.completed === 3000, "org completed");

const django = advisorFeeTotals(cases, "django");
const rene = advisorFeeTotals(cases, "rene");
assert(django.total === 5000, "django gets shared + solo");
assert(rene.total === 3000, "rene gets shared only");
assert(django.completed === 3000 && rene.completed === 3000, "shared full both");
assert(
  django.total + rene.total !== org.total,
  "advisor sums must not equal organisation omzet",
);

console.log("verify-fee-omzet-helpers: OK");
