"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { DollarSign, X, MapPin, Building2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { TEAM_MEMBERS } from "@/lib/data";
import type { LeaseStatus, Lease } from "@/lib/data";

// --- Kanban columns = lease statuses ---
const columns: { key: LeaseStatus; label: string; headerBg: string }[] = [
  { key: "Uncategorized", label: "Uncategorized", headerBg: "bg-muted/50 border-border" },
  { key: "Monitor - Long Term", label: "Monitor - Long Term", headerBg: "bg-blue-500/15 border-blue-500/30" },
  { key: "Hot Pursuit", label: "Hot Pursuit", headerBg: "bg-red-500/15 border-red-500/30" },
  { key: "Active Pursuit", label: "Active Pursuit", headerBg: "bg-purple-500/15 border-purple-500/30" },
  { key: "Meeting Scheduled", label: "Meeting Scheduled", headerBg: "bg-cyan-500/15 border-cyan-500/30" },
  { key: "Monitor - Near Term", label: "Monitor - Near Term", headerBg: "bg-amber-500/15 border-amber-500/30" },
  { key: "On Hold", label: "On Hold", headerBg: "bg-muted/50 border-border" },
  { key: "Strategy", label: "Strategy", headerBg: "bg-indigo-500/15 border-indigo-500/30" },
  { key: "Touring", label: "Touring", headerBg: "bg-teal-500/15 border-teal-500/30" },
  { key: "Negotiations", label: "Negotiations", headerBg: "bg-orange-500/15 border-orange-500/30" },
  { key: "In Lease", label: "In Lease", headerBg: "bg-emerald-500/15 border-emerald-500/30" },
  { key: "Closed", label: "Closed", headerBg: "bg-green-500/15 border-green-500/30" },
  { key: "Lost/Dead/Dud", label: "Lost/Dead/Dud", headerBg: "bg-muted/50 border-border" },
];

const leaseEditFields: FieldDef[] = [
  { key: "company", label: "Company", type: "text" },
  { key: "address", label: "Address", type: "text" },
  { key: "suites", label: "Suite(s)", type: "text" },
  { key: "squareFootage", label: "Square Footage", type: "number" },
  { key: "leaseCommencement", label: "Lease Commencement", type: "text", placeholder: "MM/DD/YYYY" },
  { key: "leaseExpiration", label: "Lease Expiration", type: "text", placeholder: "MM/DD/YYYY" },
  { key: "agreement", label: "Agreement", type: "select", options: ["New Lease", "Renewal", "2nd Amendment", "Expansion"] },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: columns.map((c) => c.key),
  },
  { key: "commissionRate", label: "Commission Rate ($/SF)", type: "number", placeholder: "1.25" },
  { key: "commissionOverride", label: "Commission Override ($)", type: "number", placeholder: "Leave blank to auto-calc" },
  { key: "teamMembers", label: "Team", type: "multi-select", options: TEAM_MEMBERS },
];

function calcLeaseTermMonths(commencement: string, expiration: string): number {
  if (!commencement || !expiration) return 0;
  const parse = (d: string) => {
    const parts = d.split("/");
    if (parts.length === 3) return new Date(`${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`);
    return new Date(d);
  };
  const start = parse(commencement);
  const end = parse(expiration);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  return Math.max((end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()), 0);
}

function calcCommission(l: Lease) {
  const rate = l.commissionRate ?? 1.25;
  const months = calcLeaseTermMonths(l.leaseCommencement, l.leaseExpiration);
  const years = months / 12;
  const calc = l.squareFootage * rate * years;
  if (l.commissionOverride != null && l.commissionOverride > 0) {
    return { value: l.commissionOverride, isOverride: true };
  }
  return { value: calc, isOverride: false };
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function OpportunitiesPage() {
  const { leases, companies, contacts, updateLease, updateCompany } = useData();

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<LeaseStatus | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<string | null>(null);

  // Filters
  const allColKeys = columns.map((c) => c.key);
  const [activeCols, setActiveCols] = useState<Set<LeaseStatus>>(() => new Set(allColKeys));
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  function toggleCol(key: LeaseStatus) {
    setActiveCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const hasActiveFilters = activeCols.size !== allColKeys.length || filterTeam !== "all" || filterSearch !== "";

  function clearFilters() {
    setActiveCols(new Set(allColKeys));
    setFilterTeam("all");
    setFilterSearch("");
  }

  const filtered = useMemo(() => {
    return leases.filter((l) => {
      if (!activeCols.has(l.status)) return false;
      if (filterTeam !== "all" && !(l.teamMembers ?? []).includes(filterTeam)) return false;
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        if (
          !l.company.toLowerCase().includes(q) &&
          !l.address.toLowerCase().includes(q) &&
          !(l.suites ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [leases, activeCols, filterTeam, filterSearch]);

  // Pipeline stats
  const totalCommission = filtered.reduce((sum, l) => sum + calcCommission(l).value, 0);
  const activeLeases = filtered.filter((l) => !["Closed", "Lost/Dead/Dud", "On Hold"].includes(l.status)).length;
  const closedLeases = filtered.filter((l) => l.status === "Closed").length;

  // Drag handler
  const handleDrop = useCallback((targetStatus: LeaseStatus) => {
    if (!dragId) return;
    const lease = leases.find((l) => l.id === dragId);
    if (!lease || lease.status === targetStatus) { setDragId(null); setDragOverCol(null); return; }

    updateLease(dragId, { status: targetStatus });

    // If dragged to Closed, update company to Client
    if (targetStatus === "Closed") {
      const company = companies.find((c) => c.id === lease.companyId);
      if (company && !company.relationship.includes("Client")) {
        updateCompany(company.id, {
          relationship: [...company.relationship.filter((r) => r !== "Prospect"), "Client"],
        });
      }
    }

    setDragId(null);
    setDragOverCol(null);
  }, [dragId, leases, companies, updateLease, updateCompany]);

  // Contact lookup
  const contactsByCompany = useMemo(() => {
    const map = new Map<string, typeof contacts>();
    for (const c of contacts) {
      if (!map.has(c.companyId)) map.set(c.companyId, []);
      map.get(c.companyId)!.push(c);
    }
    return map;
  }, [contacts]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Summary */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15">
            <DollarSign size={16} className="text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Commission{hasActiveFilters ? " (filtered)" : ""}</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(totalCommission)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
            <Building2 size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Leases</p>
            <p className="text-sm font-semibold text-foreground">{activeLeases}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
            <Building2 size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Closed</p>
            <p className="text-sm font-semibold text-foreground">{closedLeases}</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {leases.length} leases
        </span>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center rounded-lg border border-input overflow-hidden">
          {columns.map((c) => (
            <button
              key={c.key}
              onClick={() => toggleCol(c.key)}
              className={`px-1.5 py-1 text-[10px] transition-colors border-r border-input last:border-r-0 ${
                activeCols.has(c.key)
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <Select value={filterTeam} onValueChange={(v) => setFilterTeam(v ?? "all")}>
          <SelectTrigger className="text-xs h-7 min-w-[130px]">
            <SelectValue placeholder="All Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team</SelectItem>
            {TEAM_MEMBERS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="text" placeholder="Search company or address..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="w-48 h-7 text-xs" />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1">
            <X size={12} /> Clear
          </Button>
        )}
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto pb-2">
        <div
          className="gap-2.5 h-full"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns.filter((c) => activeCols.has(c.key)).length}, minmax(180px, 1fr))`,
            minWidth: `${columns.filter((c) => activeCols.has(c.key)).length * 185}px`,
          }}
        >
          {columns.filter((c) => activeCols.has(c.key)).map((col) => {
            const colLeases = filtered.filter((l) => l.status === col.key);
            const colCommission = colLeases.reduce((sum, l) => sum + calcCommission(l).value, 0);

            return (
              <div
                key={col.key}
                className={`flex flex-col gap-2 min-w-[180px] rounded-lg p-1 transition-colors ${dragOverCol === col.key ? "bg-muted/30 ring-2 ring-ring/30" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(col.key); }}
              >
                {/* Column header */}
                <div className={`rounded-lg border px-2.5 py-1.5 ${col.headerBg}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground truncate">{col.label}</span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] shrink-0">{colLeases.length}</Badge>
                  </div>
                  {colCommission > 0 && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{formatCurrency(colCommission)}</p>
                  )}
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                  {colLeases.map((lease) => {
                    const comm = calcCommission(lease);
                    const termMonths = calcLeaseTermMonths(lease.leaseCommencement, lease.leaseExpiration);
                    const companyContacts = contactsByCompany.get(lease.companyId) ?? [];

                    return (
                      <Card
                        key={lease.id}
                        className={`shrink-0 cursor-grab active:cursor-grabbing transition-opacity ${dragId === lease.id ? "opacity-40" : ""}`}
                        draggable
                        onDragStart={() => setDragId(lease.id)}
                        onDragEnd={() => { setDragId(null); setDragOverCol(null); }}
                      >
                        <CardContent className="p-2.5 space-y-1.5">
                          {/* Address + edit */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <MapPin size={10} className="text-muted-foreground shrink-0" />
                                <Link
                                  href={`/buildings/${lease.buildingId}?from=opportunities`}
                                  className="text-[11px] font-semibold text-cw-blue hover:underline truncate"
                                >
                                  {lease.address}
                                </Link>
                              </div>
                              {lease.suites && (
                                <p className="text-[10px] text-muted-foreground ml-3.5">{lease.suites}</p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setEditId(lease.id);
                                setEditValues({
                                  company: lease.company,
                                  address: lease.address,
                                  suites: lease.suites,
                                  squareFootage: lease.squareFootage,
                                  leaseCommencement: lease.leaseCommencement,
                                  leaseExpiration: lease.leaseExpiration,
                                  agreement: lease.agreement,
                                  status: lease.status,
                                  commissionRate: lease.commissionRate ?? 1.25,
                                  commissionOverride: lease.commissionOverride ?? "",
                                  teamMembers: lease.teamMembers ?? [],
                                });
                                setEditOpen(true);
                              }}
                              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            >
                              <Pencil size={10} />
                            </button>
                          </div>

                          {/* Company */}
                          <Link
                            href={`/companies/${lease.companyId}?from=opportunities`}
                            className="text-[11px] text-cw-green hover:underline block truncate"
                          >
                            {lease.company}
                          </Link>

                          {/* Key metrics */}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                            <div>
                              <span className="text-muted-foreground">SF</span>
                              <p className="font-medium">{lease.squareFootage.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Commission</span>
                              <p className={`font-medium ${comm.isOverride ? "text-amber-400" : "text-emerald-400"}`}>
                                {formatCurrency(comm.value)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Expiration</span>
                              <p className="font-medium">{lease.leaseExpiration || "—"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Term</span>
                              <p className="font-medium">{(termMonths / 12).toFixed(1)}yr</p>
                            </div>
                          </div>

                          {/* Agreement */}
                          <p className="text-[10px] text-muted-foreground">{lease.agreement}</p>

                          {/* Top contact */}
                          {companyContacts.length > 0 && (
                            <div className="text-[10px] text-muted-foreground border-t border-border/50 pt-1 mt-1">
                              <Link href={`/contacts/${companyContacts[0].id}?from=opportunities`} className="text-cw-green hover:underline">
                                {companyContacts[0].name}
                              </Link>
                              {companyContacts.length > 1 && (
                                <span className="text-muted-foreground/60"> +{companyContacts.length - 1} more</span>
                              )}
                            </div>
                          )}

                          {/* Team */}
                          {(lease.teamMembers ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lease.teamMembers.map((m) => (
                                <span key={m} className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0 text-[9px] text-indigo-400">
                                  {m.split(" ")[0]}
                                </span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {colLeases.length === 0 && (
                    <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border/50 p-3 min-h-[60px]">
                      <p className="text-[10px] text-muted-foreground">Drop lease here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit lease dialog */}
      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Lease"
        fields={leaseEditFields}
        values={editValues}
        onSave={(formValues) => {
          if (editId) {
            updateLease(editId, {
              ...formValues,
              squareFootage: Number(formValues.squareFootage ?? 0),
              commissionRate: formValues.commissionRate ? Number(formValues.commissionRate) : 1.25,
              commissionOverride: formValues.commissionOverride ? Number(formValues.commissionOverride) : null,
              teamMembers: Array.isArray(formValues.teamMembers) ? formValues.teamMembers as string[] : [],
            } as Partial<Lease>);
          }
        }}
      />
    </div>
  );
}
