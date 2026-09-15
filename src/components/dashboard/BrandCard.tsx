import { Logo } from "./Logo";

type BrandCardProps = {
  tagline?: string;
};

export function BrandCard({
  tagline = "Samen meer mogelijk",
}: BrandCardProps) {
  return (
    <div className="hidden shrink-0 items-center gap-3 rounded-xl border border-dba-border bg-dba-surface px-4 py-3 sm:flex">
      <Logo variant="dark" showWordmark={false} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-dba-dark-green">DBA advies</p>
        <p className="text-xs text-dba-muted">{tagline}</p>
      </div>
    </div>
  );
}
