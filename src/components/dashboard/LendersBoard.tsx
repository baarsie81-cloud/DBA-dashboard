"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { ManagedLender } from "@/db/queries/lenders";
import { LenderDeleteForm } from "./LenderDeleteForm";
import { LenderForm } from "./LenderForm";
import { LenderMergeForm } from "./LenderMergeForm";

type LendersBoardProps = {
  lenders: ManagedLender[];
};

type PanelState =
  | { open: false }
  | { open: true; mode: "create"; lender: null }
  | {
      open: true;
      mode: "edit" | "merge" | "delete";
      lender: ManagedLender;
    };

export function LendersBoard({ lenders }: LendersBoardProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<PanelState>({ open: false });
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const closePanel = useCallback(() => {
    setPanel({ open: false });
  }, []);

  const handleCompleted = useCallback((message: string) => {
    setPanel({ open: false });
    setNotice(message);
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (!panel.open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel.open, closePanel]);

  return (
    <>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setPanel({ open: true, mode: "create", lender: null })}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-dba-dark-green px-4 text-sm font-medium text-white transition-colors hover:bg-dba-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-dark-green focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Geldverstrekker toevoegen
        </button>
      </div>

      {notice ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {notice}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-dba-border bg-dba-surface shadow-[0_1px_2px_rgba(51,53,54,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead className="border-b border-dba-border bg-[#fafbfa]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Naam
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-dba-muted uppercase">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody>
              {lenders.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-12 text-center text-sm text-dba-muted"
                  >
                    Nog geen geldverstrekkers. Voeg de eerste geldverstrekker
                    toe.
                  </td>
                </tr>
              ) : (
                lenders.map((lender) => (
                  <tr
                    key={lender.id}
                    className="border-b border-dba-border last:border-b-0 hover:bg-[#fbfcfb]"
                  >
                    <td className="px-4 py-3.5 font-medium text-dba-charcoal">
                      {lender.name}
                      <span className="mt-0.5 block text-[12px] font-normal text-dba-muted">
                        {lender.caseCount} dossier
                        {lender.caseCount === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${
                          lender.active
                            ? "bg-dba-pill-bg text-dba-pill-text"
                            : "bg-dba-background text-dba-muted"
                        }`}
                      >
                        {lender.active ? "Actief" : "Inactief"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setPanel({
                              open: true,
                              mode: "edit",
                              lender,
                            })
                          }
                          className="inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium text-dba-muted transition-colors hover:bg-dba-background hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
                        >
                          Bewerken
                        </button>
                        {lenders.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPanel({ open: true, mode: "merge", lender })
                            }
                            className="inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium text-dba-muted transition-colors hover:bg-dba-background hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-dark-green focus-visible:ring-offset-1"
                          >
                            Samenvoegen
                          </button>
                        ) : null}
                        {lender.caseCount === 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPanel({ open: true, mode: "delete", lender })
                            }
                            className="inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
                          >
                            Verwijderen
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-dba-border px-4 py-3">
          <p className="text-[13px] text-dba-muted">
            {lenders.length === 0
              ? "0 geldverstrekkers"
              : `${lenders.length} geldverstrekker${lenders.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </section>

      {panel.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Sluiten"
            className="absolute inset-0 bg-dba-charcoal/30"
            onClick={closePanel}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lender-dialog-title"
            className="relative w-full max-w-md rounded-xl border border-dba-border bg-dba-surface p-6 shadow-lg"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-dba-muted uppercase">
                  Beheer
                </p>
                <h2
                  id="lender-dialog-title"
                  className="mt-1 text-lg font-semibold tracking-tight text-dba-charcoal"
                >
                  {panel.mode === "create"
                    ? "Geldverstrekker toevoegen"
                    : panel.mode === "edit"
                      ? "Geldverstrekker bewerken"
                      : panel.mode === "merge"
                        ? "Geldverstrekker samenvoegen"
                        : "Geldverstrekker verwijderen"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-dba-muted transition-colors hover:bg-dba-background hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
                aria-label="Sluiten"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            {panel.mode === "create" || panel.mode === "edit" ? (
              <LenderForm
                key={panel.mode === "edit" ? panel.lender.id : "create"}
                mode={panel.mode}
                initial={panel.lender}
                onCancel={closePanel}
                onSuccess={() =>
                  handleCompleted(
                    panel.mode === "create"
                      ? "Geldverstrekker toegevoegd."
                      : "Geldverstrekker bijgewerkt.",
                  )
                }
              />
            ) : panel.mode === "merge" ? (
              <LenderMergeForm
                key={panel.lender.id}
                source={panel.lender}
                lenders={lenders}
                onCancel={closePanel}
                onSuccess={() =>
                  handleCompleted("Geldverstrekker samengevoegd.")
                }
              />
            ) : (
              <LenderDeleteForm
                key={panel.lender.id}
                lender={panel.lender}
                onCancel={closePanel}
                onSuccess={() =>
                  handleCompleted("Geldverstrekker verwijderd.")
                }
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
