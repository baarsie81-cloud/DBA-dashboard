import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiGrid } from "@/components/dashboard/KpiCard";
import { MortgagePhaseBoard } from "@/components/dashboard/MortgagePhaseBoard";
import { getActiveAdvisors, listAdvisors } from "@/db/queries/advisors";
import { getMortgageColumnOrder } from "@/db/queries/dashboard-settings";
import { getActiveLenders, listLenders } from "@/db/queries/lenders";
import { getMortgageCasesByPhase } from "@/db/queries/mortgage-cases";
import { buildPhaseKpis, mapCaseToDossier } from "@/lib/mortgage-cases";
import {
  hasActiveMortgageFilters,
  parseMortgageListParams,
} from "@/lib/mortgage-list-params";
import type { MortgagePhasePageConfig } from "@/lib/mortgage-phase-config";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function MortgagePhasePage({
  config,
  searchParams,
}: {
  config: MortgagePhasePageConfig;
  searchParams: PageProps["searchParams"];
}) {
  const params = await searchParams;
  const listDefaults = {
    sort: config.defaultSort,
    direction: config.defaultDirection,
  };
  const filters = parseMortgageListParams(params, listDefaults);
  const activeFilters = hasActiveMortgageFilters(filters);

  const [
    kpiRows,
    tableRows,
    filterAdvisors,
    filterLenders,
    activeAdvisors,
    activeLenders,
    columnOrder,
  ] = await Promise.all([
    getMortgageCasesByPhase(config.phase),
    getMortgageCasesByPhase(config.phase, filters),
    listAdvisors(),
    listLenders(),
    getActiveAdvisors(),
    getActiveLenders(),
    getMortgageColumnOrder(),
  ]);

  const kpiDossiers = kpiRows.map(mapCaseToDossier);
  const dossiers = tableRows.map(mapCaseToDossier);
  const kpis = buildPhaseKpis(config.kpiVariant, kpiDossiers);

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="HYPOTHEEKDASHBOARD"
        title={config.title}
        subtitle={config.subtitle}
      />

      <KpiGrid items={kpis} />

      <MortgagePhaseBoard
        dossiers={dossiers}
        columnOrder={columnOrder}
        filterAdvisors={filterAdvisors}
        filterLenders={filterLenders}
        activeAdvisors={activeAdvisors}
        activeLenders={activeLenders}
        hasActiveFilters={activeFilters}
        emptyState={config.emptyState}
        defaultPhase={config.phase}
        showDeadlineFilters={config.showDeadlineFilters}
        showFeeUnprocessedFilter={config.showFeeUnprocessedFilter}
      />
    </div>
  );
}
