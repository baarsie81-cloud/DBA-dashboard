"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { mockAdvisors, mockLenders } from "@/lib/mock-data";

export function FilterBar() {
  const [query, setQuery] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [lender, setLender] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dba-border bg-dba-surface px-4 py-3">
      <label className="relative min-w-[220px] flex-1">
        <span className="sr-only">Zoek op klantnaam</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-dba-muted"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek op klantnaam..."
          className="h-10 w-full rounded-lg border border-dba-border bg-dba-background pr-3 pl-9 text-sm text-dba-charcoal outline-none placeholder:text-dba-muted focus:border-dba-green"
        />
      </label>

      <select
        value={advisor}
        onChange={(event) => setAdvisor(event.target.value)}
        className="h-10 min-w-[160px] rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus:border-dba-green"
        aria-label="Filter op adviseur"
      >
        <option value="">Alle adviseurs</option>
        {mockAdvisors.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={lender}
        onChange={(event) => setLender(event.target.value)}
        className="h-10 min-w-[180px] rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus:border-dba-green"
        aria-label="Filter op geldverstrekker"
      >
        <option value="">Alle geldverstrekkers</option>
        {mockLenders.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={dateFilter}
        onChange={(event) => setDateFilter(event.target.value)}
        className="h-10 min-w-[140px] rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus:border-dba-green"
        aria-label="Filter op datum"
      >
        <option value="">Alle datums</option>
        <option value="week">Deze week</option>
        <option value="month">Deze maand</option>
        <option value="closing-14">Passeerdatum ≤ 14 dagen</option>
      </select>

      <button
        type="button"
        className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg bg-dba-dark-green px-4 text-sm font-medium text-white transition-colors hover:bg-dba-green"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Dossier toevoegen
      </button>
    </div>
  );
}
