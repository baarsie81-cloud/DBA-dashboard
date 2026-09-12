import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KpiGrid } from "@/components/dashboard/KpiCard";
import { MortgageTable } from "@/components/dashboard/MortgageTable";
import { getMortgageCasesByPhase } from "@/db/queries/mortgage-cases";
import {
  buildInBehandelingKpis,
  mapCaseToDossier,
} from "@/lib/mortgage-cases";

export default async function InBehandelingPage() {
  const rows = await getMortgageCasesByPhase("in_behandeling");
  const dossiers = rows.map(mapCaseToDossier);
  const kpis = buildInBehandelingKpis(dossiers);

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        title="In behandeling"
        subtitle="Overzicht van alle hypotheekdossiers die momenteel in behandeling zijn."
      />

      <KpiGrid items={kpis} />

      <FilterBar />

      <MortgageTable dossiers={dossiers} />
    </div>
  );
}
