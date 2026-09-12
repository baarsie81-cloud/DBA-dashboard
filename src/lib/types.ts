export type MortgagePhase =
  | "Prospect"
  | "In behandeling"
  | "Geannuleerd"
  | "Afgehandeld";

export type MortgageDossier = {
  id: string;
  clientName: string;
  advisor: string;
  lender: string;
  principal: number;
  applicationDate: string;
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
