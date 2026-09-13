import type { MortgagePhase as DbMortgagePhase } from "@/db/schema";
import type {
  MortgageSortDirection,
  MortgageSortField,
} from "@/lib/mortgage-list-params";

export type MortgagePhaseKpiVariant =
  | "prospect"
  | "in_behandeling"
  | "geannuleerd"
  | "afgehandeld";

export type MortgagePhasePageConfig = {
  phase: DbMortgagePhase;
  path: string;
  title: string;
  subtitle: string;
  emptyState: string;
  defaultSort: MortgageSortField;
  defaultDirection: MortgageSortDirection;
  showDeadlineFilters: boolean;
  showFeeUnprocessedFilter: boolean;
  kpiVariant: MortgagePhaseKpiVariant;
};

export const MORTGAGE_PHASE_PAGES: MortgagePhasePageConfig[] = [
  {
    phase: "prospect",
    path: "/prospects",
    title: "Prospects",
    subtitle: "Overzicht van hypotheekdossiers in de prospectfase.",
    emptyState: "Geen prospects gevonden.",
    defaultSort: "application_date",
    defaultDirection: "desc",
    showDeadlineFilters: true,
    showFeeUnprocessedFilter: false,
    kpiVariant: "prospect",
  },
  {
    phase: "in_behandeling",
    path: "/in-behandeling",
    title: "In behandeling",
    subtitle:
      "Overzicht van alle hypotheekdossiers die momenteel in behandeling zijn.",
    emptyState: "Geen dossiers in behandeling.",
    defaultSort: "passing_date",
    defaultDirection: "asc",
    showDeadlineFilters: true,
    showFeeUnprocessedFilter: false,
    kpiVariant: "in_behandeling",
  },
  {
    phase: "geannuleerd",
    path: "/geannuleerd",
    title: "Geannuleerd",
    subtitle: "Overzicht van geannuleerde hypotheekdossiers.",
    emptyState: "Geen geannuleerde dossiers gevonden.",
    defaultSort: "application_date",
    defaultDirection: "desc",
    showDeadlineFilters: false,
    showFeeUnprocessedFilter: false,
    kpiVariant: "geannuleerd",
  },
  {
    phase: "afgehandeld",
    path: "/afgehandeld",
    title: "Afgehandeld",
    subtitle: "Overzicht van afgehandelde hypotheekdossiers.",
    emptyState: "Geen afgehandelde dossiers gevonden.",
    defaultSort: "passing_date",
    defaultDirection: "desc",
    showDeadlineFilters: false,
    showFeeUnprocessedFilter: true,
    kpiVariant: "afgehandeld",
  },
];

export const MORTGAGE_PHASE_PATHS = MORTGAGE_PHASE_PAGES.map(
  (page) => page.path,
);

/** Paths that show mortgage case data and should refresh after mutations. */
export const MORTGAGE_VIEW_PATHS = [
  ...MORTGAGE_PHASE_PATHS,
  "/overzicht",
] as const;

export function getMortgagePhasePageConfig(
  pathname: string,
): MortgagePhasePageConfig | null {
  return MORTGAGE_PHASE_PAGES.find((page) => page.path === pathname) ?? null;
}
