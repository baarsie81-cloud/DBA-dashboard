import {
  ADVISOR_ALIASES,
  DASHBOARD_NOTES_MARKER,
  EXCEL_NOTES_MARKER,
} from "./constants";

const EMPTY_TOKENS = new Set([
  "",
  "-",
  "--",
  "nvt",
  "n.v.t.",
  "n.v.t",
  "n/a",
  "na",
  "geen",
  "leeg",
  // "Nog niet bekend" — used for principal_amount in real DBA Excel files.
  "nnb",
]);

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeLookupKey(value: string): string {
  return collapseWhitespace(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Treat blank / placeholder cells as null. */
export function emptyToNull(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  const text = collapseWhitespace(String(raw));
  if (!text) return null;
  if (EMPTY_TOKENS.has(text.toLowerCase())) return null;
  if (text === "undefined" || text === "null") return null;
  return text;
}

/**
 * Build customer_name in the existing DBA display style:
 * "[tussenvoegsel] achternaam, voorletter(s)"
 */
export function buildCustomerName(
  lastName: string | null,
  initials: string | null,
  infix: string | null,
): string | null {
  const family = collapseWhitespace([infix, lastName].filter(Boolean).join(" "));
  if (!family) return null;
  if (!initials) return family;
  return `${family}, ${collapseWhitespace(initials)}`;
}

/**
 * Deterministic re-import identity.
 * Primary: achternaam|voorletters|tussenvoegsels|application_date
 * Fallback without application_date: append |nodate|mortgage_type
 * Phase is excluded so sheet moves update the same dossier.
 */
export function buildLegacyImportKey(input: {
  lastName: string;
  initials: string | null;
  infix: string | null;
  applicationDate: string | null;
  mortgageType: string | null;
}): string {
  const base = [
    normalizeLookupKey(input.lastName),
    normalizeLookupKey(input.initials ?? ""),
    normalizeLookupKey(input.infix ?? ""),
  ].join("|");

  if (input.applicationDate) {
    return `v1|${base}|${input.applicationDate}`;
  }

  return `v1|${base}|nodate|${normalizeLookupKey(input.mortgageType ?? "")}`;
}

export function splitAdvisorLabels(raw: string): string[] {
  return raw
    .split(/\s*(?:\/|,|&|;|\ben\b)\s*/i)
    .map((part) => collapseWhitespace(part))
    .filter(Boolean);
}

export function resolveAdvisorAlias(label: string): string {
  const key = normalizeLookupKey(label);
  return ADVISOR_ALIASES[key] ?? collapseWhitespace(label);
}

export function parseExcelDate(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; raw: string } {
  if (raw == null || raw === "") return { ok: true, value: null };

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const parsed = excelSerialToIso(raw);
    if (!parsed) return { ok: false, raw: String(raw) };
    return { ok: true, value: parsed };
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return { ok: true, value: raw.toISOString().slice(0, 10) };
  }

  const text = collapseWhitespace(String(raw));
  if (!text || EMPTY_TOKENS.has(text.toLowerCase())) {
    return { ok: true, value: null };
  }

  if (/^(nnb|onbekend|tbd|\?+)$/i.test(text)) {
    return { ok: true, value: null };
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const iso = text.slice(0, 10);
    if (Number.isNaN(new Date(`${iso}T00:00:00`).getTime())) {
      return { ok: false, raw: text };
    }
    return { ok: true, value: iso };
  }

  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (match) {
    const iso = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
    if (Number.isNaN(new Date(`${iso}T00:00:00`).getTime())) {
      return { ok: false, raw: text };
    }
    return { ok: true, value: iso };
  }

  return { ok: false, raw: text };
}

function excelSerialToIso(serial: number): string | null {
  if (serial < 1 || serial > 100000) return null;
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial * 86400000);
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function parseExcelAmount(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; raw: string } {
  if (raw == null || raw === "") return { ok: true, value: null };
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { ok: true, value: raw.toFixed(2) };
  }

  const text = emptyToNull(raw);
  if (text == null) return { ok: true, value: null };

  let normalized = text.replace(/€/g, "").replace(/\s/g, "");
  if (normalized.includes(".") && normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, raw: text };
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return { ok: false, raw: text };
  return { ok: true, value: amount.toFixed(2) };
}

export function buildExcelNotesSection(
  status: string | null,
  todo: string | null,
): string | null {
  const parts: string[] = [];
  if (status) parts.push(`Status:\n${status}`);
  if (todo) parts.push(`To do:\n${todo}`);
  if (parts.length === 0) return null;
  return `${EXCEL_NOTES_MARKER}\n${parts.join("\n\n")}`;
}

export function extractDashboardNotes(notes: string | null): string | null {
  if (!notes) return null;
  const idx = notes.indexOf(DASHBOARD_NOTES_MARKER);
  if (idx >= 0) {
    const body = notes.slice(idx + DASHBOARD_NOTES_MARKER.length).trim();
    return body || null;
  }
  if (!notes.includes(EXCEL_NOTES_MARKER)) {
    return notes.trim() || null;
  }
  return null;
}

/** Replace only the Excel-import section; preserve dashboard notes. */
export function mergeNotesForImport(
  existingNotes: string | null,
  excelSection: string | null,
): string | null {
  const dashboard = extractDashboardNotes(existingNotes);
  const chunks: string[] = [];
  if (excelSection) chunks.push(excelSection);
  if (dashboard) chunks.push(`${DASHBOARD_NOTES_MARKER}\n${dashboard}`);
  if (chunks.length === 0) return null;
  return chunks.join("\n\n");
}
