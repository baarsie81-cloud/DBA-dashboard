import type { MortgagePhase } from "@/db/schema";
import { isMortgagePhase } from "@/lib/mortgage-validation";
import { todayIsoAmsterdam } from "@/lib/dates";

export type OverviewFilters = {
  year: number | null;
  advisorId: string | null;
  lenderId: string | null;
  phase: MortgagePhase | null;
};

export function parseOverviewParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): OverviewFilters {
  const get = (key: string): string => {
    if (params instanceof URLSearchParams) {
      return params.get(key)?.trim() ?? "";
    }
    const raw = params[key];
    if (Array.isArray(raw)) return raw[0]?.trim() ?? "";
    return raw?.trim() ?? "";
  };

  const yearRaw = get("year");
  const yearNum = Number(yearRaw);
  const year =
    yearRaw !== "" && Number.isInteger(yearNum) && yearNum >= 2000 && yearNum <= 2100
      ? yearNum
      : null;

  const phaseRaw = get("phase");

  return {
    year,
    advisorId: get("advisor") || null,
    lenderId: get("lender") || null,
    phase: isMortgagePhase(phaseRaw) ? phaseRaw : null,
  };
}

export function hasActiveOverviewFilters(filters: OverviewFilters): boolean {
  return Boolean(
    filters.year != null ||
      filters.advisorId ||
      filters.lenderId ||
      filters.phase,
  );
}

export function buildOverviewHref(
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, string | null | undefined>,
): string {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }

  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function currentAmsterdamYear(): number {
  return Number(todayIsoAmsterdam().slice(0, 4));
}
