"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Sun, Moon, ChevronRight, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { companies, contacts, buildings } from "@/lib/data";

const sectionLabels: Record<string, string> = {
  companies: "Companies",
  contacts: "Contacts",
  leases: "Leases",
  buildings: "Buildings",
  opportunities: "Opportunities",
  activities: "Activities",
  prospecting: "Prospecting",
};

function getEntityName(section: string, id: string): string | null {
  switch (section) {
    case "companies": {
      const c = companies.find((x) => x.id === id);
      return c?.name ?? id;
    }
    case "contacts": {
      const ct = contacts.find((x) => x.id === id);
      return ct?.name ?? id;
    }
    case "buildings": {
      const b = buildings.find((x) => x.id === id);
      return b?.address ?? id;
    }
    default:
      return id;
  }
}

interface Crumb {
  label: string;
  href?: string;
}

function buildBreadcrumbs(pathname: string): Crumb[] {
  if (pathname === "/") return [{ label: "Dashboard" }];

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/" }];

  if (segments.length >= 1) {
    const section = segments[0];
    const label = sectionLabels[section] ?? section;

    if (segments.length === 1) {
      crumbs.push({ label });
    } else {
      crumbs.push({ label, href: `/${section}` });
      const entityId = segments[1];
      const entityName = getEntityName(section, entityId);
      crumbs.push({ label: entityName ?? entityId });
    }
  }

  return crumbs;
}

export function TopBar() {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-card px-6">
      <nav className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight size={14} className="text-muted-foreground/50" />
              )}
              {i === 0 && crumb.href && (
                <Home size={14} className="mr-0.5 text-muted-foreground" />
              )}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "font-medium",
                    isLast ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Search..."
            className={cn(
              "h-8 w-56 pl-8 text-sm bg-muted/40 border-border"
            )}
          />
        </div>
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
