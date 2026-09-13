import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ExcelImportPanel } from "@/components/dashboard/ExcelImportPanel";

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="BEHEER"
        title="Excel-import"
        subtitle="Importeer het vaste DBA hypotheekoverzicht."
      />
      <ExcelImportPanel />
    </div>
  );
}
