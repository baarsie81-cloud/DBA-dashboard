import { AdvisorsBoard } from "@/components/dashboard/AdvisorsBoard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { listAdvisors } from "@/db/queries/advisors";

export default async function AdvisorsPage() {
  const advisors = await listAdvisors();

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="BEHEER"
        title="Adviseurs"
        subtitle="Beheer de adviseurs die aan hypotheekdossiers gekoppeld kunnen worden."
      />

      <AdvisorsBoard advisors={advisors} />
    </div>
  );
}
