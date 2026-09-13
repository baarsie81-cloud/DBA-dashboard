import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  advisors,
  excelImports,
  lenders,
  mortgageCaseAdvisors,
  mortgageCases,
  type MortgagePhase,
} from "@/db/schema";
import { DASHBOARD_NOTES_MARKER, EXCEL_NOTES_MARKER } from "./constants";
import {
  mergeNotesForImport,
  normalizeLookupKey,
  resolveAdvisorAlias,
} from "./normalize";
import type { ParseIssue, ParsedImportRow } from "./parse-workbook";

export type ImportRowStatus = "new" | "updated" | "unchanged" | "error";

export type ImportWritePayload = {
  legacyImportKey: string;
  customerName: string;
  mortgageType: string | null;
  applicationDate: string | null;
  lenderId: string | null;
  principalAmount: string | null;
  lastCheckDate: string | null;
  financingConditionDate: string | null;
  bankGuarantee: string | null;
  guaranteeDate: string | null;
  passingDate: string | null;
  offerExpiryDate: string | null;
  mortgageConfirmationDate: string | null;
  fee: string | null;
  feeProcessingDate: string | null;
  notes: string | null;
  phase: MortgagePhase;
  advisorIds: string[];
  existingCaseId?: string;
};

export type ImportRowPlan = {
  status: ImportRowStatus;
  sheet: string;
  excelRowNumber: number;
  customerName: string;
  legacyImportKey: string;
  reason?: string;
  warnings: string[];
  payload?: ImportWritePayload;
};

export type ImportPreview = {
  totalRows: number;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  errorCount: number;
  rows: ImportRowPlan[];
};

export type ImportExecutionResult = {
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  errorCount: number;
  errors: Array<{
    sheet: string;
    excelRowNumber: number;
    customerName: string;
    reason: string;
  }>;
  importId: string;
};

type ExistingCase = {
  id: string;
  legacyImportKey: string | null;
  customerName: string;
  mortgageType: string | null;
  applicationDate: string | Date | null;
  lenderId: string | null;
  principalAmount: string | null;
  lastCheckDate: string | Date | null;
  financingConditionDate: string | Date | null;
  bankGuarantee: string | null;
  guaranteeDate: string | Date | null;
  passingDate: string | Date | null;
  offerExpiryDate: string | Date | null;
  mortgageConfirmationDate: string | Date | null;
  fee: string | null;
  feeProcessingDate: string | Date | null;
  notes: string | null;
  phase: MortgagePhase;
  advisorIds: string[];
};

function toIsoDate(value: string | Date | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function sameText(a: string | null, b: string | null): boolean {
  return (a ?? null) === (b ?? null);
}

function sameAmount(a: string | null, b: string | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

function excelNotesComparable(notes: string | null): string | null {
  if (!notes || !notes.includes(EXCEL_NOTES_MARKER)) return null;
  const end = notes.indexOf(DASHBOARD_NOTES_MARKER);
  const section = end >= 0 ? notes.slice(0, end) : notes;
  return section.trim() || null;
}

function hasFieldChanges(existing: ExistingCase, next: ImportWritePayload): boolean {
  if (existing.customerName !== next.customerName) return true;
  if (!sameText(existing.mortgageType, next.mortgageType)) return true;
  if (!sameText(toIsoDate(existing.applicationDate), next.applicationDate)) return true;
  if (!sameText(existing.lenderId, next.lenderId)) return true;
  if (!sameAmount(existing.principalAmount, next.principalAmount)) return true;
  if (!sameText(toIsoDate(existing.lastCheckDate), next.lastCheckDate)) return true;
  if (!sameText(toIsoDate(existing.financingConditionDate), next.financingConditionDate)) return true;
  if (!sameText(existing.bankGuarantee, next.bankGuarantee)) return true;
  if (!sameText(toIsoDate(existing.guaranteeDate), next.guaranteeDate)) return true;
  if (!sameText(toIsoDate(existing.passingDate), next.passingDate)) return true;
  if (!sameText(toIsoDate(existing.offerExpiryDate), next.offerExpiryDate)) return true;
  if (!sameText(toIsoDate(existing.mortgageConfirmationDate), next.mortgageConfirmationDate)) return true;
  if (!sameAmount(existing.fee, next.fee)) return true;
  if (!sameText(toIsoDate(existing.feeProcessingDate), next.feeProcessingDate)) return true;
  if (existing.phase !== next.phase) return true;
  if (!sameText(excelNotesComparable(existing.notes), excelNotesComparable(next.notes))) return true;
  return next.advisorIds.some((id) => !existing.advisorIds.includes(id));
}

async function loadExistingByKeys(keys: string[]): Promise<Map<string, ExistingCase[]>> {
  const db = getDb();
  const map = new Map<string, ExistingCase[]>();
  if (keys.length === 0) return map;

  const cases = await db
    .select({
      id: mortgageCases.id,
      legacyImportKey: mortgageCases.legacyImportKey,
      customerName: mortgageCases.customerName,
      mortgageType: mortgageCases.mortgageType,
      applicationDate: mortgageCases.applicationDate,
      lenderId: mortgageCases.lenderId,
      principalAmount: mortgageCases.principalAmount,
      lastCheckDate: mortgageCases.lastCheckDate,
      financingConditionDate: mortgageCases.financingConditionDate,
      bankGuarantee: mortgageCases.bankGuarantee,
      guaranteeDate: mortgageCases.guaranteeDate,
      passingDate: mortgageCases.passingDate,
      offerExpiryDate: mortgageCases.offerExpiryDate,
      mortgageConfirmationDate: mortgageCases.mortgageConfirmationDate,
      fee: mortgageCases.fee,
      feeProcessingDate: mortgageCases.feeProcessingDate,
      notes: mortgageCases.notes,
      phase: mortgageCases.phase,
    })
    .from(mortgageCases)
    .where(inArray(mortgageCases.legacyImportKey, keys));

  const caseIds = cases.map((row) => row.id);
  const links =
    caseIds.length === 0
      ? []
      : await db
          .select({
            mortgageCaseId: mortgageCaseAdvisors.mortgageCaseId,
            advisorId: mortgageCaseAdvisors.advisorId,
          })
          .from(mortgageCaseAdvisors)
          .where(inArray(mortgageCaseAdvisors.mortgageCaseId, caseIds));

  const byCase = new Map<string, string[]>();
  for (const link of links) {
    const list = byCase.get(link.mortgageCaseId) ?? [];
    list.push(link.advisorId);
    byCase.set(link.mortgageCaseId, list);
  }

  for (const row of cases) {
    if (!row.legacyImportKey) continue;
    const entry: ExistingCase = {
      ...row,
      advisorIds: byCase.get(row.id) ?? [],
    };
    const list = map.get(row.legacyImportKey) ?? [];
    list.push(entry);
    map.set(row.legacyImportKey, list);
  }

  return map;
}

async function warmLookupCaches(): Promise<{
  lenders: Map<string, string>;
  advisors: Map<string, string>;
}> {
  const db = getDb();
  const lenderCache = new Map<string, string>();
  const advisorCache = new Map<string, string>();

  for (const row of await db.select({ id: lenders.id, name: lenders.name }).from(lenders)) {
    lenderCache.set(normalizeLookupKey(row.name), row.id);
  }
  for (const row of await db.select({ id: advisors.id, name: advisors.name }).from(advisors)) {
    advisorCache.set(normalizeLookupKey(row.name), row.id);
  }

  return { lenders: lenderCache, advisors: advisorCache };
}

async function resolveLenderId(
  lenderName: string | null,
  cache: Map<string, string>,
  createIfMissing: boolean,
): Promise<{ id: string | null; willCreate?: string }> {
  if (!lenderName) return { id: null };
  const key = normalizeLookupKey(lenderName);
  if (!key) return { id: null };
  if (cache.has(key)) return { id: cache.get(key)! };
  if (!createIfMissing) return { id: null, willCreate: lenderName.trim() };

  const db = getDb();
  const [created] = await db
    .insert(lenders)
    .values({ name: lenderName.trim(), active: true, updatedAt: new Date() })
    .returning({ id: lenders.id });
  cache.set(key, created.id);
  return { id: created.id };
}

async function resolveAdvisorIds(
  labels: string[],
  cache: Map<string, string>,
  createIfMissing: boolean,
): Promise<{ ids: string[]; error?: string; willCreate: string[] }> {
  const ids: string[] = [];
  const willCreate: string[] = [];

  for (const label of labels) {
    const canonical = resolveAdvisorAlias(label);
    const key = normalizeLookupKey(canonical);
    if (!key) continue;

    if (cache.has(key)) {
      const id = cache.get(key)!;
      if (!ids.includes(id)) ids.push(id);
      continue;
    }

    if (!canonical.includes(" ")) {
      return {
        ids: [],
        willCreate: [],
        error: `Onbekende adviseur "${label}" (geen betrouwbare match).`,
      };
    }

    if (!createIfMissing) {
      willCreate.push(canonical);
      continue;
    }

    const db = getDb();
    const [created] = await db
      .insert(advisors)
      .values({ name: canonical, active: true, updatedAt: new Date() })
      .returning({ id: advisors.id });
    cache.set(key, created.id);
    if (!ids.includes(created.id)) ids.push(created.id);
  }

  return { ids, willCreate };
}

export async function buildImportPreview(
  parsedRows: ParsedImportRow[],
  parseIssues: ParseIssue[],
  options?: { createLookups?: boolean },
): Promise<ImportPreview> {
  const createLookups = options?.createLookups ?? false;
  const plans: ImportRowPlan[] = [];

  for (const issue of parseIssues) {
    plans.push({
      status: "error",
      sheet: issue.sheet,
      excelRowNumber: issue.excelRowNumber ?? 0,
      customerName: issue.customerLabel ?? "Onbekend",
      legacyImportKey: "",
      reason: issue.reason,
      warnings: [],
    });
  }

  const keyCounts = new Map<string, number>();
  for (const row of parsedRows) {
    keyCounts.set(row.legacyImportKey, (keyCounts.get(row.legacyImportKey) ?? 0) + 1);
  }

  const existingMap = await loadExistingByKeys([
    ...new Set(parsedRows.map((row) => row.legacyImportKey)),
  ]);
  const caches = await warmLookupCaches();

  for (const row of parsedRows) {
    const warnings = [...row.warnings];

    if ((keyCounts.get(row.legacyImportKey) ?? 0) > 1) {
      plans.push({
        status: "error",
        sheet: row.sheet,
        excelRowNumber: row.excelRowNumber,
        customerName: row.customerName,
        legacyImportKey: row.legacyImportKey,
        reason: "Dubbele dossieridentiteit in Excel.",
        warnings,
      });
      continue;
    }

    const matches = existingMap.get(row.legacyImportKey) ?? [];
    if (matches.length > 1) {
      plans.push({
        status: "error",
        sheet: row.sheet,
        excelRowNumber: row.excelRowNumber,
        customerName: row.customerName,
        legacyImportKey: row.legacyImportKey,
        reason: "Ambigue match: meerdere dossiers met dezelfde importsleutel.",
        warnings,
      });
      continue;
    }

    const lenderResult = await resolveLenderId(row.lenderName, caches.lenders, createLookups);
    if (lenderResult.willCreate) {
      warnings.push(`Geldverstrekker "${lenderResult.willCreate}" wordt bij import aangemaakt.`);
    }

    const advisorResult = await resolveAdvisorIds(row.advisorLabels, caches.advisors, createLookups);
    if (advisorResult.error) {
      plans.push({
        status: "error",
        sheet: row.sheet,
        excelRowNumber: row.excelRowNumber,
        customerName: row.customerName,
        legacyImportKey: row.legacyImportKey,
        reason: advisorResult.error,
        warnings,
      });
      continue;
    }
    for (const name of advisorResult.willCreate) {
      warnings.push(`Adviseur "${name}" wordt bij import aangemaakt.`);
    }

    const existing = matches[0];
    let lenderId = lenderResult.id;
    if (!createLookups && existing && row.lenderName && !lenderId) {
      lenderId = existing.lenderId;
    }

    const advisorIds = existing
      ? Array.from(new Set([...existing.advisorIds, ...advisorResult.ids]))
      : advisorResult.ids;

    const payload: ImportWritePayload = {
      legacyImportKey: row.legacyImportKey,
      customerName: row.customerName,
      mortgageType: row.mortgageType,
      applicationDate: row.applicationDate,
      lenderId,
      principalAmount: row.principalAmount,
      lastCheckDate: row.lastCheckDate,
      financingConditionDate: row.financingConditionDate,
      bankGuarantee: row.bankGuarantee,
      guaranteeDate: row.guaranteeDate,
      passingDate: row.passingDate,
      offerExpiryDate: row.offerExpiryDate,
      mortgageConfirmationDate: row.mortgageConfirmationDate,
      fee: row.fee,
      feeProcessingDate: row.feeProcessingDate,
      notes: mergeNotesForImport(existing?.notes ?? null, row.excelNotesSection),
      phase: row.phase,
      advisorIds,
      existingCaseId: existing?.id,
    };

    if (!existing) {
      plans.push({
        status: "new",
        sheet: row.sheet,
        excelRowNumber: row.excelRowNumber,
        customerName: row.customerName,
        legacyImportKey: row.legacyImportKey,
        warnings,
        payload,
      });
      continue;
    }

    if (!hasFieldChanges(existing, payload)) {
      plans.push({
        status: "unchanged",
        sheet: row.sheet,
        excelRowNumber: row.excelRowNumber,
        customerName: row.customerName,
        legacyImportKey: row.legacyImportKey,
        warnings,
      });
      continue;
    }

    plans.push({
      status: "updated",
      sheet: row.sheet,
      excelRowNumber: row.excelRowNumber,
      customerName: row.customerName,
      legacyImportKey: row.legacyImportKey,
      warnings,
      payload,
    });
  }

  return {
    totalRows: plans.length,
    newCount: plans.filter((row) => row.status === "new").length,
    updatedCount: plans.filter((row) => row.status === "updated").length,
    unchangedCount: plans.filter((row) => row.status === "unchanged").length,
    errorCount: plans.filter((row) => row.status === "error").length,
    rows: plans,
  };
}

export async function executeImport(
  parsedRows: ParsedImportRow[],
  parseIssues: ParseIssue[],
  filename: string,
): Promise<ImportExecutionResult> {
  const preview = await buildImportPreview(parsedRows, parseIssues, {
    createLookups: true,
  });
  const db = getDb();

  const errors: ImportExecutionResult["errors"] = [];
  let newCount = 0;
  let updatedCount = 0;
  const unchangedCount = preview.unchangedCount;
  let errorCount = preview.errorCount;

  for (const plan of preview.rows) {
    if (plan.status === "error") {
      errors.push({
        sheet: plan.sheet,
        excelRowNumber: plan.excelRowNumber,
        customerName: plan.customerName,
        reason: plan.reason ?? "Onbekende fout.",
      });
      continue;
    }
    if (plan.status === "unchanged" || !plan.payload) continue;

    try {
      await db.transaction(async (tx) => {
        const payload = plan.payload!;

        if (plan.status === "new") {
          const [created] = await tx
            .insert(mortgageCases)
            .values({
              customerName: payload.customerName,
              mortgageType: payload.mortgageType,
              applicationDate: payload.applicationDate,
              lenderId: payload.lenderId,
              principalAmount: payload.principalAmount,
              lastCheckDate: payload.lastCheckDate,
              financingConditionDate: payload.financingConditionDate,
              bankGuarantee: payload.bankGuarantee,
              guaranteeDate: payload.guaranteeDate,
              passingDate: payload.passingDate,
              offerExpiryDate: payload.offerExpiryDate,
              mortgageConfirmationDate: payload.mortgageConfirmationDate,
              fee: payload.fee,
              feeProcessingDate: payload.feeProcessingDate,
              notes: payload.notes,
              phase: payload.phase,
              legacyImportKey: payload.legacyImportKey,
              updatedAt: new Date(),
            })
            .returning({ id: mortgageCases.id });

          if (payload.advisorIds.length > 0) {
            await tx.insert(mortgageCaseAdvisors).values(
              payload.advisorIds.map((advisorId) => ({
                mortgageCaseId: created.id,
                advisorId,
              })),
            );
          }
          newCount += 1;
          return;
        }

        const caseId = payload.existingCaseId;
        if (!caseId) {
          throw new Error("Interne fout: dossier-id ontbreekt bij update.");
        }

        await tx
          .update(mortgageCases)
          .set({
            customerName: payload.customerName,
            mortgageType: payload.mortgageType,
            applicationDate: payload.applicationDate,
            lenderId: payload.lenderId,
            principalAmount: payload.principalAmount,
            lastCheckDate: payload.lastCheckDate,
            financingConditionDate: payload.financingConditionDate,
            bankGuarantee: payload.bankGuarantee,
            guaranteeDate: payload.guaranteeDate,
            passingDate: payload.passingDate,
            offerExpiryDate: payload.offerExpiryDate,
            mortgageConfirmationDate: payload.mortgageConfirmationDate,
            fee: payload.fee,
            feeProcessingDate: payload.feeProcessingDate,
            notes: payload.notes,
            phase: payload.phase,
            legacyImportKey: payload.legacyImportKey,
            updatedAt: new Date(),
          })
          .where(eq(mortgageCases.id, caseId));

        // Additive advisor sync only — never remove existing links.
        if (payload.advisorIds.length > 0) {
          const existingLinks = await tx
            .select({ advisorId: mortgageCaseAdvisors.advisorId })
            .from(mortgageCaseAdvisors)
            .where(eq(mortgageCaseAdvisors.mortgageCaseId, caseId));
          const existingIds = new Set(existingLinks.map((link) => link.advisorId));
          const toAdd = payload.advisorIds.filter((id) => !existingIds.has(id));
          if (toAdd.length > 0) {
            await tx.insert(mortgageCaseAdvisors).values(
              toAdd.map((advisorId) => ({
                mortgageCaseId: caseId,
                advisorId,
              })),
            );
          }
        }

        updatedCount += 1;
      });
    } catch (error) {
      errorCount += 1;
      errors.push({
        sheet: plan.sheet,
        excelRowNumber: plan.excelRowNumber,
        customerName: plan.customerName,
        reason:
          error instanceof Error
            ? error.message
            : "Onbekende fout tijdens schrijven.",
      });
    }
  }

  const [log] = await db
    .insert(excelImports)
    .values({
      filename,
      totalRows: preview.totalRows,
      newCount,
      updatedCount,
      unchangedCount,
      errorCount,
    })
    .returning({ id: excelImports.id });

  return {
    newCount,
    updatedCount,
    unchangedCount,
    errorCount,
    errors,
    importId: log.id,
  };
}
