import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KpiGrid } from "@/components/dashboard/KpiCard";
import { MortgageTable } from "@/components/dashboard/MortgageTable";
import { inBehandelingKpis, mockDossiers } from "@/lib/mock-data";

export default function InBehandelingPage() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        title="In behandeling"
        subtitle="Overzicht van alle hypotheekdossiers die momenteel in behandeling zijn."
      />

      <KpiGrid items={inBehandelingKpis} />

      <FilterBar />

      <MortgageTable dossiers={mockDossiers} totalCount={18} page={1} pageSize={10} />
    </div>
  );
}
