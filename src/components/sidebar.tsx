"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Building,
  TrendingUp,
  Calendar,
  Target,
  Scale,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Companies", icon: Building2, href: "/companies" },
  { label: "Contacts", icon: Users, href: "/contacts" },
  { label: "Leases", icon: FileText, href: "/leases" },
  { label: "Buildings", icon: Building, href: "/buildings" },
  { label: "Opportunities", icon: TrendingUp, href: "/opportunities" },
  { label: "Activities", icon: Calendar, href: "/activities" },
  { label: "Tasks", icon: ClipboardList, href: "/tasks" },
  { label: "Comps", icon: Scale, href: "/comps" },
  { label: "Prospecting", icon: Target, href: "/prospecting" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="px-4 py-4">
        <h1 className="text-base font-semibold tracking-tight text-white">
          BPN Solutions
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Cushman &amp; Wakefield
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {navItems.map(({ label, icon: Icon, href }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
