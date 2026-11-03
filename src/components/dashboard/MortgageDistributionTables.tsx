import { formatCurrency } from "@/lib/format";
import type { MortgageDistributionCategory } from "@/lib/mortgage-distribution";

const percentageFormatter = new Intl.NumberFormat("nl-NL", {
  style: "percent",
  maximumFractionDigits: 1,
});

function Principal({ amount, missing }: { amount: number | null; missing: number }) {
  return (
    <>
      <span className="whitespace-nowrap">{formatCurrency(amount)}</span>
      {missing > 0 ? (
        <span className="mt-0.5 block text-xs font-normal text-dba-muted">
          {missing} {missing === 1 ? "bedrag ontbreekt" : "bedragen ontbreken"}
        </span>
      ) : null}
    </>
  );
}

export function MortgageDistributionTables({
  categories,
  year,
  advisorName,
}: {
  categories: MortgageDistributionCategory[];
  year: number | null;
  advisorName: string;
}) {
  return (
    <section aria-labelledby="mortgage-distribution-title" className="flex flex-col gap-3">
      <div>
        <h2 id="mortgage-distribution-title" className="text-base font-semibold text-dba-charcoal">
          Hypotheekverdeling per geldverstrekker
        </h2>
        <p className="mt-1 text-sm text-dba-muted">
          In behandeling + Afgehandeld · {year == null ? "Alle dossierjaren" : `Dossierjaar ${year}`} · {advisorName}
        </p>
        <p className="mt-1 text-xs text-dba-muted">
          Alle geldverstrekkers; de fase- en geldverstrekkerfilters bovenaan gelden hier niet.
          Percentages zijn gebaseerd op het aantal dossiers binnen elke categorie.
          Afwijkende of ontbrekende categorieën vallen onder Overig / niet ingedeeld.
          Bij ontbrekende bedragen wordt alleen de bekende hoofdsom getoond, met het aantal ontbrekende bedragen.
          Afgeronde percentages kunnen samen iets afwijken van 100%.
        </p>
      </div>
      {categories.map((category) => (
        <div key={category.category} className="overflow-hidden rounded-xl border border-dba-border bg-dba-surface shadow-[0_1px_2px_rgba(51,53,54,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-sm">
              <caption className="border-b border-dba-border px-4 py-3 text-left font-semibold text-dba-charcoal">
                {category.category}
              </caption>
              <thead className="border-b border-dba-border bg-[#fafbfa] text-[11px] tracking-wide text-dba-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left">Geldverstrekker</th>
                  <th scope="col" className="px-4 py-2 text-right">Aantal</th>
                  <th scope="col" className="px-4 py-2 text-right">Percentage</th>
                  <th scope="col" className="px-4 py-2 text-right">Hypotheekbedrag</th>
                </tr>
              </thead>
              <tbody className="text-dba-charcoal">
                {category.rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-4 text-center text-dba-muted">Geen dossiers voor deze selectie.</td></tr>
                ) : category.rows.map((row) => (
                  <tr key={row.lenderId ?? "none"} className="border-b border-dba-border">
                    <th scope="row" className="px-4 py-2 text-left font-medium">{row.lenderName}</th>
                    <td className="px-4 py-2 text-right tabular-nums">{row.count}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{percentageFormatter.format(row.percentage / 100)}</td>
                    <td className="px-4 py-2 text-right tabular-nums"><Principal amount={row.principalTotal} missing={row.missingPrincipalCount} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-dba-border bg-[#fafbfa] font-semibold text-dba-charcoal">
                <tr>
                  <th scope="row" className="px-4 py-2 text-left">Totaal {category.category}</th>
                  <td className="px-4 py-2 text-right tabular-nums">{category.count}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{category.count > 0 ? "100%" : "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums"><Principal amount={category.principalTotal} missing={category.missingPrincipalCount} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
