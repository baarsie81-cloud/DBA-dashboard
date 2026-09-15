export type MortgagePhase =
  | "Prospect"
  | "In behandeling"
  | "Geannuleerd"
  | "Afgehandeld";

/** Row shape for the mortgage table UI. */
export type MortgageDossier = {
  id: string;
  /** Primary display line (Klant 1 or legacy customer_name). */
  clientName: string;
  /** Optional second line for Klant 2 / partner. */
  clientNameSecondary: string | null;
  advisor: string | null;
  lender: string | null;
  svn: boolean;
  readyForPassing: boolean;
  dossierYear: number | null;
  principal: number | null;
  applicationDate: string | null;
  conditionalDate: string | null;
  closingDate: string | null;
  offerExpiryDate: string | null;
  feeProcessingDate: string | null;
  phase: MortgagePhase;
};

export type KpiItem = {
  id: string;
  value: string;
  label: string;
  icon: "folder" | "euro" | "calendar" | "clock" | "alert";
};
