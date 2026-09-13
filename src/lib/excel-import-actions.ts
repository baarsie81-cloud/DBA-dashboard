"use server";

import { MAX_UPLOAD_BYTES } from "@/lib/excel-import/constants";
import { parseDbaWorkbook } from "@/lib/excel-import/parse-workbook";
import {
  buildImportPreview,
  executeImport,
  type ImportExecutionResult,
  type ImportPreview,
} from "@/lib/excel-import/run-import";

export type PreviewActionResult =
  | { ok: true; preview: ImportPreview }
  | { ok: false; error: string };

export type ExecuteActionResult =
  | { ok: true; result: ImportExecutionResult }
  | { ok: false; error: string };

async function readXlsxFile(
  formData: FormData,
): Promise<{ ok: true; buffer: ArrayBuffer; filename: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Kies een .xlsx-bestand." };
  }

  const filename = file.name || "upload.xlsx";
  if (!filename.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, error: "Alleen .xlsx-bestanden worden geaccepteerd." };
  }

  if (file.size <= 0) {
    return { ok: false, error: "Het gekozen bestand is leeg." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: "Bestand is te groot (maximaal 5 MB).",
    };
  }

  const buffer = await file.arrayBuffer();
  return { ok: true, buffer, filename };
}

export async function previewExcelImportAction(
  formData: FormData,
): Promise<PreviewActionResult> {
  const read = await readXlsxFile(formData);
  if (!read.ok) return read;

  const parsed = parseDbaWorkbook(read.buffer);
  if (!parsed.ok) {
    return { ok: false, error: parsed.message };
  }

  const preview = await buildImportPreview(parsed.rows, parsed.issues, {
    createLookups: false,
  });

  return { ok: true, preview };
}

export async function executeExcelImportAction(
  formData: FormData,
): Promise<ExecuteActionResult> {
  const read = await readXlsxFile(formData);
  if (!read.ok) return read;

  const parsed = parseDbaWorkbook(read.buffer);
  if (!parsed.ok) {
    return { ok: false, error: parsed.message };
  }

  const result = await executeImport(parsed.rows, parsed.issues, read.filename);
  return { ok: true, result };
}
