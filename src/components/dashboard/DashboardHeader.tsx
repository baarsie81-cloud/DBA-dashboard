import { BrandCard } from "./BrandCard";

type DashboardHeaderProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
};

export function DashboardHeader({
  title,
  subtitle,
  eyebrow = "Hypotheekdashboard",
}: DashboardHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-dba-muted">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 text-[1.75rem] font-semibold tracking-tight text-dba-charcoal">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-dba-muted">
          {subtitle}
        </p>
      </div>
      <BrandCard />
    </header>
  );
}
