const currencyFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return currencyFormatter.format(amount);
}

/** Formats an ISO date (YYYY-MM-DD) as dd-mm-yyyy. */
export function formatDateNl(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function displayText(value: string | null | undefined): string {
  if (!value) return "—";
  return value;
}
