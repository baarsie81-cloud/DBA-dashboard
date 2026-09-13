import type { MortgageCaseRow } from "@/db/queries/mortgage-cases";
import { addDaysIso, todayIsoAmsterdam } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import type { KpiItem, MortgageDossier, MortgagePhase } from "@/lib/types";

export { addDaysIso, todayIsoAmsterdam } from "@/lib/dates";

const PHASE_LABELS: Record<string, MortgagePhase> = {
  prospect: "Prospect",
  in_behandeling: "In behandeling",
  geannuleerd: "Geannuleerd",
  afgehandeld: "Afgehandeld",
};

/** Normalize DB date values to YYYY-MM-DD. */
function toIsoDate(value: string | Date | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function mapCaseToDossier(row: MortgageCaseRow): MortgageDossier {
  const principal =
    row.principalAmount == null || row.principalAmount === ""
      ? null
      : Number(row.principalAmount);

  return {
    id: row.id,
    clientName: row.customerName,
    advisor: row.advisorName,
    lender: row.lenderName,
    principal: principal != null && Number.isFinite(principal) ? principal : null,
    applicationDate: toIsoDate(row.applicationDate),
    conditionalDate: toIsoDate(row.financingConditionDate),
    closingDate: toIsoDate(row.passingDate),
    phase: PHASE_LABELS[row.phase] ?? "In behandeling",
  };
}

function isWithinInclusiveRange(
  value: string | null,
  start: string,
  end: string,
): boolean {
  if (!value) return false;
  return value >= start && value <= end;
}

/** Simple KPIs derived from the already-fetched in-behandeling dataset. */
export function buildInBehandelingKpis(dossiers: MortgageDossier[]): KpiItem[] {
  const today = todayIsoAmsterdam();
  const until = addDaysIso(today, 14);

  const totalPrincipal = dossiers.reduce(
    (sum, dossier) => sum + (dossier.principal ?? 0),
    0,
  );

  const passingSoon = dossiers.filter((dossier) =>
    isWithinInclusiveRange(dossier.closingDate, today, until),
  ).length;

  const financingSoon = dossiers.filter((dossier) =>
    isWithinInclusiveRange(dossier.conditionalDate, today, until),
  ).length;

  return [
    {
      id: "kpi-dossiers",
      value: String(dossiers.length),
      label: "Dossiers in behandeling",
      icon: "folder",
    },
    {
      id: "kpi-principal",
      value: formatCurrency(totalPrincipal),
      label: "Totale hoofdsom",
      icon: "euro",
    },
    {
      id: "kpi-closing",
      value: String(passingSoon),
      label: "Passeerdatum komende 14 dagen",
      icon: "calendar",
    },
    {
      id: "kpi-conditional",
      value: String(financingSoon),
      label: "Ontbindende voorwaarden komende 14 dagen",
      icon: "clock",
    },
  ];
}
