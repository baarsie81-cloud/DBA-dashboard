import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { InBehandelingBoard } from "@/components/dashboard/InBehandelingBoard";
import { KpiGrid } from "@/components/dashboard/KpiCard";
import { getActiveAdvisors, listAdvisors } from "@/db/queries/advisors";
import { getActiveLenders, listLenders } from "@/db/queries/lenders";
import { getMortgageCasesByPhase } from "@/db/queries/mortgage-cases";
import {
  buildInBehandelingKpis,
  mapCaseToDossier,
} from "@/lib/mortgage-cases";
import {
  hasActiveMortgageFilters,
  parseMortgageListParams,
} from "@/lib/mortgage-list-params";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InBehandelingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseMortgageListParams(params);
  const activeFilters = hasActiveMortgageFilters(filters);

  const [kpiRows, tableRows, filterAdvisors, filterLenders, activeAdvisors, activeLenders] =
    await Promise.all([
      getMortgageCasesByPhase("in_behandeling"),
      getMortgageCasesByPhase("in_behandeling", filters),
      listAdvisors(),
      listLenders(),
      getActiveAdvisors(),
      getActiveLenders(),
    ]);

  const kpiDossiers = kpiRows.map(mapCaseToDossier);
  const dossiers = tableRows.map(mapCaseToDossier);
  const kpis = buildInBehandelingKpis(kpiDossiers);

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        title="In behandeling"
        subtitle="Overzicht van alle hypotheekdossiers die momenteel in behandeling zijn."
      />

      <KpiGrid items={kpis} />

      <InBehandelingBoard
        dossiers={dossiers}
        filterAdvisors={filterAdvisors}
        filterLenders={filterLenders}
        activeAdvisors={activeAdvisors}
        activeLenders={activeLenders}
        hasActiveFilters={activeFilters}
        defaultPhase="in_behandeling"
      />
    </div>
  );
}
