import { MortgagePhasePage } from "@/components/dashboard/MortgagePhasePage";
import { MORTGAGE_PHASE_PAGES } from "@/lib/mortgage-phase-config";

const config = MORTGAGE_PHASE_PAGES.find((page) => page.path === "/geannuleerd")!;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function PhaseRoutePage({ searchParams }: PageProps) {
  return <MortgagePhasePage config={config} searchParams={searchParams} />;
}
