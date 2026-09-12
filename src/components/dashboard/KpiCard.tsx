import { CalendarDays, Clock3, FolderOpen, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { KpiItem } from "@/lib/types";

const iconMap: Record<KpiItem["icon"], LucideIcon> = {
  folder: FolderOpen,
  euro: Landmark,
  calendar: CalendarDays,
  clock: Clock3,
};

type KpiCardProps = {
  item: KpiItem;
};

export function KpiCard({ item }: KpiCardProps) {
  const Icon = iconMap[item.icon];

  return (
    <article className="rounded-xl border border-dba-border bg-dba-surface px-4 py-4 shadow-[0_1px_2px_rgba(51,53,54,0.03)]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-dba-green">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-[1.35rem] font-semibold tracking-tight text-dba-charcoal">
            {item.value}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-dba-muted">
            {item.label}
          </p>
        </div>
      </div>
    </article>
  );
}

type KpiGridProps = {
  items: KpiItem[];
};

export function KpiGrid({ items }: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <KpiCard key={item.id} item={item} />
      ))}
    </div>
  );
}
