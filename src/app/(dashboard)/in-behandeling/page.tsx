import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { InBehandelingBoard } from "@/components/dashboard/InBehandelingBoard";
import { KpiGrid } from "@/components/dashboard/KpiCard";
import { getActiveAdvisors } from "@/db/queries/advisors";
import { getActiveLenders } from "@/db/queries/lenders";
import { getMortgageCasesByPhase } from "@/db/queries/mortgage-cases";
import {
  buildInBehandelingKpis,
  mapCaseToDossier,
} from "@/lib/mortgage-cases";

export default async function InBehandelingPage() {
  const [rows, activeAdvisors, activeLenders] = await Promise.all([
    getMortgageCasesByPhase("in_behandeling"),
    getActiveAdvisors(),
    getActiveLenders(),
  ]);
  const dossiers = rows.map(mapCaseToDossier);
  const kpis = buildInBehandelingKpis(dossiers);

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        title="In behandeling"
        subtitle="Overzicht van alle hypotheekdossiers die momenteel in behandeling zijn."
      />

      <KpiGrid items={kpis} />

      <InBehandelingBoard
        dossiers={dossiers}
        activeAdvisors={activeAdvisors}
        activeLenders={activeLenders}
        defaultPhase="in_behandeling"
      />
    </div>
  );
}
