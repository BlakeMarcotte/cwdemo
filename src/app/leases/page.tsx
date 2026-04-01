"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { ArrowUpDown, CheckSquare, Square, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TEAM_MEMBERS } from "@/lib/data";
import type { Lease } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { ScrollableTable } from "@/components/ui/scrollable-table";

type SortKey = keyof Lease;

const LEASE_STATUSES = [
  "Uncategorized", "Monitor - Long Term", "Hot Pursuit", "Active Pursuit",
  "Meeting Scheduled", "Monitor - Near Term", "On Hold", "Strategy",
  "Touring", "Negotiations", "In Lease", "Closed", "Lost/Dead/Dud",
] as const;

const leaseStatusColor: Record<string, string> = {
  "Uncategorized": "bg-muted text-muted-foreground border-border",
  "Monitor - Long Term": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Hot Pursuit": "bg-red-500/15 text-red-400 border-red-500/30",
  "Active Pursuit": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Meeting Scheduled": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "Monitor - Near Term": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "On Hold": "bg-muted text-muted-foreground border-border",
  "Strategy": "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  "Touring": "bg-teal-500/15 text-teal-400 border-teal-500/30",
  "Negotiations": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "In Lease": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Closed": "bg-green-500/15 text-green-400 border-green-500/30",
  "Lost/Dead/Dud": "bg-muted text-muted-foreground border-border",
};

const leaseFields: FieldDef[] = [
  { key: "company", label: "Company", type: "text" },
  { key: "companyId", label: "Company ID", type: "text", placeholder: "Company ID" },
  { key: "address", label: "Address", type: "text" },
  { key: "buildingId", label: "Building ID", type: "text", placeholder: "Building ID" },
  { key: "suites", label: "Suite(s)", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "zipCode", label: "Zip Code", type: "text" },
  {
    key: "submarket",
    label: "Submarket",
    type: "select",
    options: ["City", "North Suburbs", "West Suburbs", "South Suburbs", "O'Hare"],
  },
  {
    key: "assetType",
    label: "Asset Type",
    type: "select",
    options: ["Office", "Industrial", "Retail", "Lab"],
  },
  { key: "squareFootage", label: "Square Footage", type: "number" },
  {
    key: "occupancy",
    label: "Occupancy",
    type: "select",
    options: ["Lease", "Own", "Sublease"],
  },
  { key: "moveInDate", label: "Move-In Date", type: "date" },
  { key: "leaseCommencement", label: "Lease Commencement", type: "date" },
  { key: "terminationDate", label: "Termination Date", type: "date" },
  { key: "leaseExpiration", label: "Lease Expiration", type: "date" },
  {
    key: "agreement",
    label: "Agreement",
    type: "select",
    options: ["New Lease", "Renewal", "2nd Amendment", "Expansion"],
  },
  { key: "tenantBrokerage", label: "Tenant Brokerage", type: "text", placeholder: "Comma-separated" },
  { key: "tenantReps", label: "Tenant Reps", type: "text", placeholder: "Comma-separated" },
  { key: "activeOpportunity", label: "Active Opportunity", type: "checkbox" },
  { key: "comp", label: "Comp", type: "checkbox" },
  { key: "subleaseList", label: "Sublease List", type: "checkbox" },
  { key: "teamMembers", label: "Team", type: "multi-select", options: TEAM_MEMBERS },
  { key: "status", label: "Status", type: "select", options: [...LEASE_STATUSES] },
  { key: "commissionRate", label: "Commission Rate ($/SF)", type: "number", placeholder: "1.25" },
  { key: "commissionOverride", label: "Commission Override ($)", type: "number", placeholder: "Leave blank to auto-calculate" },
];

function calcLeaseTermMonths(commencement: string, expiration: string): number {
  if (!commencement || !expiration) return 0;
  // Parse MM/DD/YYYY or YYYY-MM-DD
  const parse = (d: string) => {
    const parts = d.split("/");
    if (parts.length === 3) return new Date(`${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`);
    return new Date(d);
  };
  const start = parse(commencement);
  const end = parse(expiration);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(months, 0);
}

function calcCommission(lease: Lease): { calculated: number; termMonths: number; termYears: number; rate: number; isOverride: boolean } {
  const rate = lease.commissionRate ?? 1.25;
  const termMonths = calcLeaseTermMonths(lease.leaseCommencement, lease.leaseExpiration);
  const termYears = termMonths / 12;
  const calculated = lease.squareFootage * rate * termYears;

  if (lease.commissionOverride != null && lease.commissionOverride > 0) {
    return { calculated: lease.commissionOverride, termMonths, termYears, rate, isOverride: true };
  }
  return { calculated, termMonths, termYears, rate, isOverride: false };
}

export default function LeasesPage() {
  const { leases, addLease } = useData();
  const [sortKey, setSortKey] = useState<SortKey>("company");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);

  // Filter state
  const [submarketFilter, setSubmarketFilter] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState("");
  const [agreementFilter, setAgreementFilter] = useState("");
  const [expirationYearFilter, setExpirationYearFilter] = useState("");
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Derived filter options from data
  const SUBMARKET_OPTIONS = ["City", "North Suburbs", "West Suburbs", "South Suburbs", "O'Hare"];
  const ASSET_TYPE_OPTIONS = ["Office", "Industrial", "Retail", "Lab"];
  const OCCUPANCY_OPTIONS = ["Lease", "Own", "Sublease"];
  const AGREEMENT_OPTIONS = ["New Lease", "Renewal", "2nd Amendment", "Expansion"];

  const expirationYears = useMemo(() => {
    const years = leases
      .map((l) => {
        if (!l.leaseExpiration) return null;
        const match = l.leaseExpiration.match(/\d{4}$/);
        if (match) return match[0];
        const match2 = l.leaseExpiration.match(/^(\d{4})/);
        if (match2) return match2[1];
        return null;
      })
      .filter(Boolean) as string[];
    return [...new Set(years)].sort();
  }, [leases]);

  const hasActiveFilters =
    submarketFilter !== "" ||
    assetTypeFilter !== "" ||
    occupancyFilter !== "" ||
    agreementFilter !== "" ||
    expirationYearFilter !== "" ||
    activeOnlyFilter ||
    statusFilter !== "" ||
    searchQuery !== "";

  function clearFilters() {
    setSubmarketFilter("");
    setAssetTypeFilter("");
    setOccupancyFilter("");
    setAgreementFilter("");
    setExpirationYearFilter("");
    setActiveOnlyFilter(false);
    setStatusFilter("");
    setSearchQuery("");
  }

  // Apply filters before sorting
  const filtered = useMemo(() => {
    return leases.filter((l) => {
      if (submarketFilter && l.submarket !== submarketFilter) return false;
      if (assetTypeFilter && l.assetType !== assetTypeFilter) return false;
      if (occupancyFilter && l.occupancy !== occupancyFilter) return false;
      if (agreementFilter && l.agreement !== agreementFilter) return false;
      if (expirationYearFilter && !l.leaseExpiration?.includes(expirationYearFilter))
        return false;
      if (activeOnlyFilter && !l.activeOpportunity) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      if (
        searchQuery &&
        !l.company.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    leases,
    submarketFilter,
    assetTypeFilter,
    occupancyFilter,
    agreementFilter,
    expirationYearFilter,
    activeOnlyFilter,
    statusFilter,
    searchQuery,
  ]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        cmp = aVal === bVal ? 0 : aVal ? -1 : 1;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    return (
      <TableHead>
        <button
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => toggleSort(field)}
        >
          {label}
          <ArrowUpDown size={12} className="text-muted-foreground" />
        </button>
      </TableHead>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Leases</h1>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" />
            Add Lease
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {leases.length} leases
        </span>
      </div>

      <EditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Lease"
        fields={leaseFields}
        values={{
          activeOpportunity: false,
          comp: false,
          subleaseList: false,
          squareFootage: 0,
          tenantBrokerage: "",
          tenantReps: "",
          teamMembers: [],
          status: "Active",
          commissionRate: 1.25,
          commissionOverride: "",
        }}
        onSave={(values) => {
          const tenantBrokerage =
            typeof values.tenantBrokerage === "string"
              ? values.tenantBrokerage.split(",").map((s: string) => s.trim()).filter(Boolean)
              : values.tenantBrokerage;
          const tenantReps =
            typeof values.tenantReps === "string"
              ? values.tenantReps.split(",").map((s: string) => s.trim()).filter(Boolean)
              : values.tenantReps;
          addLease({
            ...values,
            tenantBrokerage,
            tenantReps,
            id: genId("l"),
          } as Lease);
        }}
      />

      {/* Filter bar */}
      <div className="rounded-lg border border-border bg-card/50 px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Submarket dropdown */}
          <select
            value={submarketFilter}
            onChange={(e) => setSubmarketFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="">All Submarkets</option>
            {SUBMARKET_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Asset Type dropdown */}
          <select
            value={assetTypeFilter}
            onChange={(e) => setAssetTypeFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="">All Asset Types</option>
            {ASSET_TYPE_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Occupancy dropdown */}
          <select
            value={occupancyFilter}
            onChange={(e) => setOccupancyFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="">All Occupancy</option>
            {OCCUPANCY_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          {/* Agreement dropdown */}
          <select
            value={agreementFilter}
            onChange={(e) => setAgreementFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="">All Agreements</option>
            {AGREEMENT_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Expiration Year dropdown */}
          <select
            value={expirationYearFilter}
            onChange={(e) => setExpirationYearFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="">All Years</option>
            {expirationYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="">All Statuses</option>
            {LEASE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Active Opportunity toggle */}
          <button
            onClick={() => setActiveOnlyFilter((v) => !v)}
            className={`inline-flex items-center rounded-md border px-2 h-7 text-xs font-medium transition-colors ${
              activeOnlyFilter
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            Active Only
          </button>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Search input */}
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-44 rounded-md border border-border bg-transparent pl-6 pr-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 h-7 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>

        {/* Count */}
        <div className="text-xs text-muted-foreground">
          Showing {filtered.length} of {leases.length} leases
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollableTable>
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Company" field="company" />
              <SortHeader label="Address" field="address" />
              <SortHeader label="Suite(s)" field="suites" />
              <SortHeader label="City" field="city" />
              <SortHeader label="Zip" field="zipCode" />
              <SortHeader label="Submarket" field="submarket" />
              <SortHeader label="Asset Type" field="assetType" />
              <SortHeader label="Square Footage" field="squareFootage" />
              <SortHeader label="Occupancy" field="occupancy" />
              <SortHeader label="Lease Commencement" field="leaseCommencement" />
              <SortHeader label="Lease Expiration" field="leaseExpiration" />
              <SortHeader label="Agreement" field="agreement" />
              <TableHead>Tenant Brokerage</TableHead>
              <TableHead className="text-xs text-right">Commission</TableHead>
              <TableHead className="text-xs text-right">Term</TableHead>
              <SortHeader label="Status" field="status" />
              <SortHeader label="Active" field="activeOpportunity" />
              <SortHeader label="Comp" field="comp" />
              <TableHead>Team</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">
                  <Link
                    href={`/companies/${l.companyId}`}
                    className="text-cw-green hover:underline font-medium"
                  >
                    {l.company}
                  </Link>
                </TableCell>
                <TableCell className="text-xs">
                  <Link
                    href={`/buildings/${l.buildingId}`}
                    className="text-cw-green hover:underline"
                  >
                    {l.address}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.suites}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.city}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.zipCode}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.submarket}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.assetType}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground text-right">
                  {l.squareFootage.toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.occupancy}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.leaseCommencement}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.leaseExpiration}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.agreement}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.tenantBrokerage.join(", ")}
                </TableCell>
                {(() => {
                  const c = calcCommission(l);
                  return (
                    <>
                      <TableCell className="text-xs text-right">
                        <span className={`font-medium ${c.isOverride ? "text-amber-400" : "text-emerald-400"}`}>
                          ${c.calculated.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <div className="text-[9px] text-muted-foreground">
                          ${(l.commissionRate ?? 1.25).toFixed(2)}/SF
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {c.termYears.toFixed(1)}yr
                        <div className="text-[9px]">{c.termMonths}mo</div>
                      </TableCell>
                    </>
                  );
                })()}
                <TableCell className="text-xs">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${leaseStatusColor[l.status] ?? leaseStatusColor["Active"]}`}
                  >
                    {l.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {l.activeOpportunity ? (
                    <CheckSquare size={14} className="text-cw-green mx-auto" />
                  ) : (
                    <Square size={14} className="text-muted-foreground/40 mx-auto" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {l.comp ? (
                    <CheckSquare size={14} className="text-cw-green mx-auto" />
                  ) : (
                    <Square size={14} className="text-muted-foreground/40 mx-auto" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(l.teamMembers ?? []).map((m) => (
                      <span key={m} className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0 text-[10px] text-indigo-400">
                        {m.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </ScrollableTable>
      </div>
    </div>
  );
}
