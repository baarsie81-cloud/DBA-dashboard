export type MortgagePhase =
  | "Prospect"
  | "In behandeling"
  | "Geannuleerd"
  | "Afgehandeld";

/** Row shape for the mortgage table UI. */
export type MortgageDossier = {
  id: string;
  clientName: string;
  advisor: string | null;
  lender: string | null;
  principal: number | null;
  applicationDate: string | null;
  conditionalDate: string | null;
  closingDate: string | null;
  phase: MortgagePhase;
};

export type KpiItem = {
  id: string;
  value: string;
  label: string;
  icon: "folder" | "euro" | "calendar" | "clock";
};
