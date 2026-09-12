"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "./Logo";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const primaryNav: NavItem[] = [
  { href: "/prospects", label: "Prospects", icon: UserRound },
  { href: "/in-behandeling", label: "In behandeling", icon: ClipboardList },
  { href: "/geannuleerd", label: "Geannuleerd", icon: XCircle },
  { href: "/afgehandeld", label: "Afgehandeld", icon: CheckCircle2 },
  { href: "/overzicht", label: "Overzicht", icon: LayoutDashboard },
];

const adminNav: NavItem[] = [
  { href: "/adviseurs", label: "Adviseurs", icon: Users },
  { href: "/geldverstrekkers", label: "Geldverstrekkers", icon: Building2 },
  { href: "/instellingen", label: "Instellingen", icon: Settings },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
        active
          ? "bg-dba-sidebar-active text-white shadow-[inset_3px_0_0_0_var(--dba-lime)]"
          : "text-white/80 hover:bg-dba-sidebar-hover hover:text-white"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${
          active ? "text-dba-lime" : "text-white/70 group-hover:text-white"
        }`}
        strokeWidth={1.75}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col bg-dba-dark-green text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Logo variant="light" />
        <p className="mt-3 text-[11px] leading-relaxed text-white/55">
          Intern dossieroverzicht
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Dossiers
          </p>
          <ul className="flex flex-col gap-0.5">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={pathname === item.href} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-3 mx-3 border-t border-white/10" />
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Beheer
          </p>
          <ul className="flex flex-col gap-0.5">
            {adminNav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={pathname === item.href} />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <p className="px-1 text-sm font-medium text-white/90">DBA Advies</p>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] text-white/65 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Uitloggen
        </button>
      </div>
    </aside>
  );
}
