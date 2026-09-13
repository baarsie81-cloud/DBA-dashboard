import { formatCurrency } from "@/lib/format";
import type {
  AdvisorStatsRow,
  LenderStatsRow,
} from "@/db/queries/statistics";

type OverviewTablesProps = {
  advisorRows: AdvisorStatsRow[];
  lenderRows: LenderStatsRow[];
};

function EmptyState() {
  return (
    <p className="px-4 py-10 text-center text-sm text-dba-muted">
      Geen gegevens gevonden voor deze filters.
    </p>
  );
}

export function OverviewTables({
  advisorRows,
  lenderRows,
}: OverviewTablesProps) {
  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-xl border border-dba-border bg-dba-surface shadow-[0_1px_2px_rgba(51,53,54,0.03)]">
        <div className="border-b border-dba-border px-4 py-3">
          <h2 className="text-sm font-semibold text-dba-charcoal">
            Per adviseur
          </h2>
          <p className="mt-0.5 text-[12.5px] text-dba-muted">
            Productie en pipeline per adviseur binnen de gekozen filters.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="border-b border-dba-border bg-[#fafbfa]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Adviseur
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Prospects
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  In behandeling
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Afgehandeld
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Geannuleerd
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Hoofdsom in behandeling
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Hoofdsom afgehandeld
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Totale hoofdsom
                </th>
              </tr>
            </thead>
            <tbody>
              {advisorRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                advisorRows.map((row) => (
                  <tr
                    key={row.advisorId ?? "none"}
                    className="border-b border-dba-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-dba-charcoal">
                      {row.advisorName}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-dba-charcoal">
                      {row.prospects}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-dba-charcoal">
                      {row.inProgress}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-dba-charcoal">
                      {row.completed}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-dba-charcoal">
                      {row.cancelled}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-dba-charcoal">
                      {formatCurrency(row.principalInProgress)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-dba-charcoal">
                      {formatCurrency(row.principalCompleted)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums text-dba-charcoal">
                      {formatCurrency(row.principalTotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-dba-border bg-dba-surface shadow-[0_1px_2px_rgba(51,53,54,0.03)]">
        <div className="border-b border-dba-border px-4 py-3">
          <h2 className="text-sm font-semibold text-dba-charcoal">
            Per geldverstrekker
          </h2>
          <p className="mt-0.5 text-[12.5px] text-dba-muted">
            Volume en plaatsingen per geldverstrekker binnen de gekozen filters.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="border-b border-dba-border bg-[#fafbfa]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Geldverstrekker
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Dossiers
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  In behandeling
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Afgehandeld
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Geannuleerd
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Totale hoofdsom
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Hoofdsom afgehandeld
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Gem. hoofdsom
                </th>
              </tr>
            </thead>
            <tbody>
              {lenderRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                lenderRows.map((row) => (
                  <tr
                    key={row.lenderId ?? "none"}
                    className="border-b border-dba-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-dba-charcoal">
                      {row.lenderName}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-dba-charcoal">
                      {row.dossiers}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-dba-charcoal">
                      {row.inProgress}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-dba-charcoal">
                      {row.completed}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-dba-charcoal">
                      {row.cancelled}
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums text-dba-charcoal">
                      {formatCurrency(row.principalTotal)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-dba-charcoal">
                      {formatCurrency(row.principalCompleted)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-dba-charcoal">
                      {formatCurrency(row.averagePrincipal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
