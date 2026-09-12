import { ArrowDownUp, MoreHorizontal } from "lucide-react";
import { formatCurrency, formatDateNl } from "@/lib/format";
import type { MortgageDossier } from "@/lib/types";

type MortgageTableProps = {
  dossiers: MortgageDossier[];
  /** Total count for pagination label (can exceed current page size). */
  totalCount?: number;
  page?: number;
  pageSize?: number;
};

function SortableHeader({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold tracking-wide text-dba-muted uppercase ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <span className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
        {label}
        <ArrowDownUp className="h-3 w-3 text-dba-border-strong" strokeWidth={1.75} aria-hidden />
      </span>
    </th>
  );
}

export function MortgageTable({
  dossiers,
  totalCount,
  page = 1,
  pageSize = 10,
}: MortgageTableProps) {
  const total = totalCount ?? dossiers.length;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="overflow-hidden rounded-xl border border-dba-border bg-dba-surface shadow-[0_1px_2px_rgba(51,53,54,0.03)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="border-b border-dba-border bg-[#fafbfa]">
            <tr>
              <SortableHeader label="Klantnaam" />
              <SortableHeader label="Adviseur" />
              <SortableHeader label="Geldverstrekker" />
              <SortableHeader label="Hoofdsom" align="right" />
              <SortableHeader label="Datum aanvraag" />
              <SortableHeader label="Ontbindende v." />
              <SortableHeader label="Passeerdatum" />
              <SortableHeader label="Fase" />
              <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                Acties
              </th>
            </tr>
          </thead>
          <tbody>
            {dossiers.map((dossier) => (
              <tr
                key={dossier.id}
                className="border-b border-dba-border last:border-b-0 hover:bg-[#fbfcfb]"
              >
                <td className="px-4 py-3.5 font-medium whitespace-nowrap text-dba-charcoal">
                  {dossier.clientName}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal">
                  {dossier.advisor}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal">
                  {dossier.lender}
                </td>
                <td className="px-4 py-3.5 text-right font-medium whitespace-nowrap tabular-nums text-dba-charcoal">
                  {formatCurrency(dossier.principal)}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-dba-charcoal">
                  {formatDateNl(dossier.applicationDate)}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-dba-charcoal">
                  {formatDateNl(dossier.conditionalDate)}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-dba-charcoal">
                  {formatDateNl(dossier.closingDate)}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="inline-flex rounded-full bg-dba-pill-bg px-2.5 py-1 text-[12px] font-medium text-dba-pill-text">
                    {dossier.phase}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dba-muted transition-colors hover:bg-dba-background hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
                    aria-label={`Acties voor ${dossier.clientName}`}
                  >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dba-border px-4 py-3">
        <p className="text-[13px] text-dba-muted">
          {start} - {end} van {total} dossiers
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded-md px-3 py-1.5 text-[13px] text-dba-muted transition-colors hover:bg-dba-background hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Vorige
          </button>
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1;
            const isActive = pageNumber === page;
            return (
              <button
                key={pageNumber}
                type="button"
                className={`min-w-8 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1 ${
                  isActive
                    ? "bg-dba-dark-green text-white"
                    : "text-dba-muted hover:bg-dba-background hover:text-dba-charcoal"
                }`}
              >
                {pageNumber}
              </button>
            );
          })}
          <button
            type="button"
            disabled={page >= totalPages}
            className="rounded-md px-3 py-1.5 text-[13px] text-dba-muted transition-colors hover:bg-dba-background hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Volgende
          </button>
        </div>
      </div>
    </section>
  );
}
