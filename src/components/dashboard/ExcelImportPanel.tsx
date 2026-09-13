"use client";

import { useState, useTransition } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import {
  executeExcelImportAction,
  previewExcelImportAction,
} from "@/lib/excel-import-actions";
import type { ImportExecutionResult, ImportPreview } from "@/lib/excel-import/run-import";

type Stage = "upload" | "preview" | "done";

export function ExcelImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    setStage("upload");
    setPreview(null);
    setResult(null);
    setError(null);
  }

  function onPreview() {
    if (!file) {
      setError("Kies eerst een .xlsx-bestand.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const response = await previewExcelImportAction(formData);
      if (!response.ok) {
        setError(response.error);
        setPreview(null);
        setStage("upload");
        return;
      }
      setPreview(response.preview);
      setStage("preview");
    });
  }

  function onExecute() {
    if (!file) {
      setError("Bestand ontbreekt. Upload opnieuw.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const response = await executeExcelImportAction(formData);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response.result);
      setStage("done");
    });
  }

  const errorRows =
    preview?.rows.filter((row) => row.status === "error").slice(0, 20) ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-dba-border bg-dba-surface p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-dba-green/10 p-2 text-dba-dark-green">
            <FileSpreadsheet className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-dba-charcoal">
              Vast DBA Excel-formaat
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-dba-muted">
              Deze import ondersteunt uitsluitend het vaste DBA Excel-formaat.
              Verwachte tabbladen: Prospects, In behandeling, Geannuleerd,
              Afgehandeld.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dba-border bg-white px-4 py-2.5 text-sm font-medium text-dba-charcoal hover:bg-dba-background">
            <Upload className="h-4 w-4" strokeWidth={1.75} />
            <span>{file ? file.name : "Kies .xlsx-bestand"}</span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              disabled={pending || stage === "done"}
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                setFile(next);
                setPreview(null);
                setResult(null);
                setError(null);
                setStage("upload");
              }}
            />
          </label>

          {stage === "upload" ? (
            <button
              type="button"
              onClick={onPreview}
              disabled={pending || !file}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-dba-dark-green px-4 text-sm font-semibold text-white transition-colors hover:bg-dba-green disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Voorbeeld tonen
            </button>
          ) : null}

          {stage === "preview" ? (
            <>
              <button
                type="button"
                onClick={onExecute}
                disabled={pending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-dba-dark-green px-4 text-sm font-semibold text-white transition-colors hover:bg-dba-green disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Import uitvoeren
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="inline-flex h-10 items-center rounded-lg border border-dba-border bg-white px-4 text-sm font-medium text-dba-charcoal hover:bg-dba-background"
              >
                Opnieuw
              </button>
            </>
          ) : null}

          {stage === "done" ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center rounded-lg border border-dba-border bg-white px-4 text-sm font-medium text-dba-charcoal hover:bg-dba-background"
            >
              Nieuwe import
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      {preview && stage !== "done" ? (
        <section className="rounded-xl border border-dba-border bg-dba-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-dba-charcoal">
            Import-voorbeeld
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Totaal" value={preview.totalRows} />
            <Stat label="Nieuw" value={preview.newCount} />
            <Stat label="Bijwerken" value={preview.updatedCount} />
            <Stat label="Ongewijzigd" value={preview.unchangedCount} />
            <Stat label="Fouten" value={preview.errorCount} />
          </div>

          {errorRows.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-dba-charcoal">
                Fouten / overgeslagen
              </h3>
              <ul className="mt-2 space-y-2">
                {errorRows.map((row) => (
                  <li
                    key={`${row.sheet}-${row.excelRowNumber}-${row.legacyImportKey}-${row.reason}`}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                  >
                    <span className="font-medium">
                      {row.sheet} · rij {row.excelRowNumber}
                    </span>
                    {row.customerName ? ` · ${row.customerName}` : ""}
                    {" — "}
                    {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {result && stage === "done" ? (
        <section className="rounded-xl border border-dba-border bg-dba-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-dba-charcoal">
            Import voltooid
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Nieuw toegevoegd" value={result.newCount} />
            <Stat label="Bijgewerkt" value={result.updatedCount} />
            <Stat label="Ongewijzigd" value={result.unchangedCount} />
            <Stat label="Overgeslagen/fouten" value={result.errorCount} />
          </div>
          {result.errors.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {result.errors.slice(0, 20).map((row) => (
                <li
                  key={`${row.sheet}-${row.excelRowNumber}-${row.reason}`}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                >
                  <span className="font-medium">
                    {row.sheet} · rij {row.excelRowNumber}
                  </span>
                  {row.customerName ? ` · ${row.customerName}` : ""}
                  {" — "}
                  {row.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-dba-border bg-white px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dba-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-dba-charcoal">{value}</p>
    </div>
  );
}
