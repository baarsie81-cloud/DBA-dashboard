import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { OverviewFilters } from "@/components/dashboard/OverviewFilters";
import { MortgageDistributionTables } from "@/components/dashboard/MortgageDistributionTables";
import { OverviewTables } from "@/components/dashboard/OverviewTables";
import { listAdvisors } from "@/db/queries/advisors";
import { listLenders } from "@/db/queries/lenders";
import {
  getAdvisorStatistics,
  getLenderStatistics,
  getOverviewKpis,
  getMortgageDistribution,
} from "@/db/queries/statistics";
import { formatCurrency } from "@/lib/format";
import { parseOverviewParams } from "@/lib/overview-params";
import type { KpiItem } from "@/lib/types";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function FiltersFallback() {
  return (
    <div className="h-[62px] animate-pulse rounded-xl border border-dba-border bg-dba-surface" />
  );
}

export default async function OverzichtPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseOverviewParams(params);

  const [advisors, lenders, kpis, advisorRows, lenderRows, distribution] = await Promise.all([
    listAdvisors(),
    listLenders(),
    getOverviewKpis(filters),
    getAdvisorStatistics(filters),
    getLenderStatistics(filters),
    getMortgageDistribution(filters),
  ]);

  const volumeKpis: KpiItem[] = [
    {
      id: "kpi-in-progress",
      value: String(kpis.inProgressCount),
      label: "Dossiers in behandeling",
      icon: "folder",
    },
    {
      id: "kpi-in-progress-principal",
      value: formatCurrency(kpis.inProgressPrincipal),
      label: "Lopende hoofdsom",
      icon: "euro",
    },
    {
      id: "kpi-completed",
      value: String(kpis.completedCount),
      label: "Afgehandeld",
      icon: "calendar",
    },
    {
      id: "kpi-completed-principal",
      value: formatCurrency(kpis.completedPrincipal),
      label: "Afgehandelde hoofdsom",
      icon: "clock",
    },
  ];

  const revenueKpis: KpiItem[] = [
    {
      id: "kpi-fee-in-progress",
      value: formatCurrency(kpis.inProgressFee),
      label: "Omzet in behandeling",
      icon: "euro",
    },
    {
      id: "kpi-fee-completed",
      value: formatCurrency(kpis.completedFee),
      label: "Afgehandelde omzet",
      icon: "euro",
    },
    {
      id: "kpi-fee-total",
      value: formatCurrency(kpis.totalFee),
      label: "Totale omzet",
      icon: "euro",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="HYPOTHEEKDASHBOARD"
        title="Overzicht"
        subtitle="Inzicht in hypotheekproductie, lopende dossiers, adviseurs en geldverstrekkers."
      />

      <Suspense fallback={<FiltersFallback />}>
        <OverviewFilters advisors={advisors} lenders={lenders} />
      </Suspense>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {volumeKpis.map((item) => (
          <KpiCard key={item.id} item={item} />
        ))}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
          Omzet (tarief)
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {revenueKpis.map((item) => (
            <KpiCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      <OverviewTables advisorRows={advisorRows} lenderRows={lenderRows} />
      <MortgageDistributionTables
        categories={distribution}
        year={filters.year}
        advisorName={filters.advisorId
          ? advisors.find((advisor) => advisor.id === filters.advisorId)?.name ?? "Onbekende adviseur"
          : "Alle adviseurs"}
      />
    </div>
  );
}
