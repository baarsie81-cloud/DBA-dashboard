import { ArrowDownUp, MoreHorizontal } from "lucide-react";
import { displayText, formatCurrency, formatDateNl } from "@/lib/format";
import type { MortgageDossier } from "@/lib/types";

type MortgageTableProps = {
  dossiers: MortgageDossier[];
};

function SortableHeader({
  label,
  align = "left",
}: {
  label: string;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold tracking-wide text-dba-muted uppercase ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <span
        className={`inline-flex items-center gap-1.5 ${
          align === "right" ? "justify-end" : ""
        }`}
      >
        {label}
        <ArrowDownUp
          className="h-3 w-3 text-dba-border-strong"
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
    </th>
  );
}

export function MortgageTable({ dossiers }: MortgageTableProps) {
  const total = dossiers.length;

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
            {total === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-dba-muted"
                >
                  Geen dossiers in behandeling.
                </td>
              </tr>
            ) : (
              dossiers.map((dossier) => (
                <tr
                  key={dossier.id}
                  className="border-b border-dba-border last:border-b-0 hover:bg-[#fbfcfb]"
                >
                  <td className="px-4 py-3.5 font-medium whitespace-nowrap text-dba-charcoal">
                    {dossier.clientName}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal">
                    {displayText(dossier.advisor)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal">
                    {displayText(dossier.lender)}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dba-border px-4 py-3">
        <p className="text-[13px] text-dba-muted">
          {total === 0
            ? "0 dossiers"
            : total <= 10
              ? `1 - ${total} van ${total} dossiers`
              : `${total} dossiers`}
        </p>
      </div>
    </section>
  );
}
