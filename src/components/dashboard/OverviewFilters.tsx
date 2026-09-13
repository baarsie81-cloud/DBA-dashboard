"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { AdvisorOption } from "@/db/queries/advisors";
import type { LenderOption } from "@/db/queries/lenders";
import { PHASE_OPTIONS } from "@/lib/mortgage-validation";
import {
  buildOverviewHref,
  hasActiveOverviewFilters,
  parseOverviewParams,
} from "@/lib/overview-params";

type OverviewFiltersProps = {
  years: number[];
  advisors: AdvisorOption[];
  lenders: LenderOption[];
};

export function OverviewFilters({
  years,
  advisors,
  lenders,
}: OverviewFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const filters = parseOverviewParams(searchParams);

  function pushParams(patch: Record<string, string | null | undefined>) {
    const href = buildOverviewHref(pathname, searchParams, patch);
    startTransition(() => {
      router.push(href);
    });
  }

  function clearFilters() {
    pushParams({
      year: null,
      advisor: null,
      lender: null,
      phase: null,
    });
  }

  const showClear = hasActiveOverviewFilters(filters);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dba-border bg-dba-surface px-4 py-3">
      <select
        value={filters.year?.toString() ?? ""}
        onChange={(event) => pushParams({ year: event.target.value || null })}
        className="h-10 min-w-[150px] rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
        aria-label="Filter op periode"
      >
        <option value="">Alle perioden</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      <select
        value={filters.advisorId ?? ""}
        onChange={(event) =>
          pushParams({ advisor: event.target.value || null })
        }
        className="h-10 min-w-[160px] rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
        aria-label="Filter op adviseur"
      >
        <option value="">Alle adviseurs</option>
        {advisors.map((advisor) => (
          <option key={advisor.id} value={advisor.id}>
            {advisor.name}
            {!advisor.active ? " (inactief)" : ""}
          </option>
        ))}
      </select>

      <select
        value={filters.lenderId ?? ""}
        onChange={(event) =>
          pushParams({ lender: event.target.value || null })
        }
        className="h-10 min-w-[180px] rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
        aria-label="Filter op geldverstrekker"
      >
        <option value="">Alle geldverstrekkers</option>
        {lenders.map((lender) => (
          <option key={lender.id} value={lender.id}>
            {lender.name}
            {!lender.active ? " (inactief)" : ""}
          </option>
        ))}
      </select>

      <select
        value={filters.phase ?? ""}
        onChange={(event) =>
          pushParams({ phase: event.target.value || null })
        }
        className="h-10 min-w-[160px] rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
        aria-label="Filter op fase"
      >
        <option value="">Alle fases</option>
        {PHASE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {showClear ? (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-dba-border bg-white px-3 text-sm font-medium text-dba-muted transition-colors hover:bg-dba-background hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
          Filters wissen
        </button>
      ) : null}
    </div>
  );
}
