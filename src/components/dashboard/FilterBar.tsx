"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import type { AdvisorOption } from "@/db/queries/advisors";
import type { LenderOption } from "@/db/queries/lenders";
import {
  buildMortgageListHref,
  hasActiveMortgageFilters,
  parseMortgageListParams,
} from "@/lib/mortgage-list-params";

type FilterBarProps = {
  advisors: AdvisorOption[];
  lenders: LenderOption[];
  onAdd?: () => void;
};

export function FilterBar({ advisors, lenders, onAdd }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const filters = parseMortgageListParams(searchParams);

  const draftRef = useRef(filters.search);
  const [debounceToken, setDebounceToken] = useState(0);

  const pushParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const href = buildMortgageListHref(pathname, searchParams, patch);
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = draftRef.current.trim();
      if (trimmed === filters.search) return;
      pushParams({ q: trimmed || null });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [debounceToken, filters.search, pushParams]);

  const clearFilters = () => {
    draftRef.current = "";
    pushParams({
      q: null,
      advisor: null,
      lender: null,
      deadline: null,
    });
  };

  const showClear = hasActiveMortgageFilters(filters);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dba-border bg-dba-surface px-4 py-3">
      <label className="relative min-w-[220px] flex-1">
        <span className="sr-only">Zoek op klantnaam</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-dba-muted"
          strokeWidth={1.75}
        />
        <input
          key={filters.search}
          type="search"
          defaultValue={filters.search}
          onChange={(event) => {
            draftRef.current = event.target.value;
            setDebounceToken((token) => token + 1);
          }}
          placeholder="Zoek op klantnaam..."
          className="h-10 w-full rounded-lg border border-dba-border bg-dba-background pr-3 pl-9 text-sm text-dba-charcoal outline-none placeholder:text-dba-muted focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
        />
      </label>

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
        value={filters.deadline ?? ""}
        onChange={(event) =>
          pushParams({ deadline: event.target.value || null })
        }
        className="h-10 min-w-[180px] rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
        aria-label="Filter op datum"
      >
        <option value="">Alle datums</option>
        <option value="passing_14">Passeerdatum komende 14 dagen</option>
        <option value="conditions_14">
          Ontbindende voorwaarden komende 14 dagen
        </option>
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

      <button
        type="button"
        onClick={onAdd}
        className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg bg-dba-dark-green px-4 text-sm font-medium text-white transition-colors hover:bg-dba-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-dark-green focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Dossier toevoegen
      </button>
    </div>
  );
}
