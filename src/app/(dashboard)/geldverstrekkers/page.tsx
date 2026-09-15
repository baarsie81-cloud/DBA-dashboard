import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LendersBoard } from "@/components/dashboard/LendersBoard";
import { listManagedLenders } from "@/db/queries/lenders";

export default async function LendersPage() {
  const lenders = await listManagedLenders();

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="BEHEER"
        title="Geldverstrekkers"
        subtitle="Beheer de geldverstrekkers die aan hypotheekdossiers gekoppeld kunnen worden."
      />

      <LendersBoard lenders={lenders} />
    </div>
  );
}
