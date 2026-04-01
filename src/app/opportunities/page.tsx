"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { TrendingUp, DollarSign, Plus, Pencil, X, Building2, MapPin } from "lucide-react";
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
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { TEAM_MEMBERS } from "@/lib/data";
import type { OpportunityStage } from "@/lib/data";

const stages: {
  key: OpportunityStage;
  label: string;
  color: string;
  headerBg: string;
}[] = [
  { key: "Lead", label: "Lead", color: "bg-muted text-muted-foreground", headerBg: "bg-muted/50 border-border" },
  { key: "Qualified", label: "Qualified", color: "bg-blue-500/20 text-blue-300", headerBg: "bg-blue-500/15 border-blue-500/30" },
  { key: "Proposal", label: "Proposal", color: "bg-amber-500/20 text-amber-300", headerBg: "bg-amber-500/15 border-amber-500/30" },
  { key: "Negotiation", label: "Negotiation", color: "bg-purple-500/20 text-purple-300", headerBg: "bg-purple-500/15 border-purple-500/30" },
  { key: "Closed Won", label: "Closed Won", color: "bg-green-500/20 text-green-300", headerBg: "bg-green-500/15 border-green-500/30" },
  { key: "Closed Lost", label: "Closed Lost", color: "bg-red-500/20 text-red-300", headerBg: "bg-red-500/15 border-red-500/30" },
];

const leaseStatusColor: Record<string, string> = {
  "Active": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Closely Monitoring": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Long Term Monitoring": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Active Pursuit": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Inactive": "bg-muted text-muted-foreground border-border",
};

const opportunityFields: FieldDef[] = [
  { key: "company", label: "Company", type: "text" },
  { key: "companyId", label: "Company ID", type: "text" },
  { key: "contact", label: "Contact", type: "text" },
  { key: "contactId", label: "Contact ID", type: "text" },
  { key: "stage", label: "Stage", type: "select", options: ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"] },
  { key: "squareFootage", label: "Square Footage", type: "number" },
  { key: "targetMoveDate", label: "Target Move Date", type: "date" },
  { key: "estimatedCommission", label: "Estimated Commission", type: "number" },
  { key: "notes", label: "Notes", type: "textarea" },
  { key: "teamMembers", label: "Team", type: "multi-select", options: TEAM_MEMBERS },
];

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function OpportunitiesPage() {
  const { opportunities, leases, companies, addOpportunity, updateOpportunity, updateCompany } = useData();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<OpportunityStage | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<string | null>(null);

  const allStageKeys = stages.map((s) => s.key);
  const [activeStages, setActiveStages] = useState<Set<OpportunityStage>>(() => new Set(allStageKeys));
  const [filterTeamMember, setFilterTeamMember] = useState("all");
  const [filterMinCommission, setFilterMinCommission] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  function toggleStage(key: OpportunityStage) {
    setActiveStages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const hasActiveFilters = activeStages.size !== allStageKeys.length || filterTeamMember !== "all" || filterMinCommission !== "" || filterSearch !== "";

  function clearFilters() {
    setActiveStages(new Set(allStageKeys));
    setFilterTeamMember("all");
    setFilterMinCommission("");
    setFilterSearch("");
  }

  const handleDrop = useCallback((targetStage: OpportunityStage) => {
    if (!dragId) return;
    const opp = opportunities.find((o) => o.id === dragId);
    if (!opp || opp.stage === targetStage) { setDragId(null); setDragOverStage(null); return; }

    updateOpportunity(dragId, { stage: targetStage });

    // If dragged to Closed Won, update company relationship to Client
    if (targetStage === "Closed Won") {
      const company = companies.find((c) => c.id === opp.companyId);
      if (company && !company.relationship.includes("Client")) {
        updateCompany(company.id, {
          relationship: [...company.relationship.filter((r) => r !== "Prospect"), "Client"],
        });
      }
    }

    setDragId(null);
    setDragOverStage(null);
  }, [dragId, opportunities, companies, updateOpportunity, updateCompany]);

  // Build a map of company leases for quick lookup
  const leasesByCompany = useMemo(() => {
    const map = new Map<string, typeof leases>();
    for (const l of leases) {
      if (!map.has(l.companyId)) map.set(l.companyId, []);
      map.get(l.companyId)!.push(l);
    }
    return map;
  }, [leases]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      if (!activeStages.has(o.stage)) return false;
      if (filterTeamMember !== "all" && !(o.teamMembers ?? []).includes(filterTeamMember)) return false;
      if (filterMinCommission !== "") {
        const min = Number(filterMinCommission);
        if (!isNaN(min) && o.estimatedCommission < min) return false;
      }
      if (filterSearch.trim() !== "") {
        const q = filterSearch.trim().toLowerCase();
        const companyLeases = leasesByCompany.get(o.companyId) ?? [];
        const matchesAddress = companyLeases.some((l) => l.address.toLowerCase().includes(q));
        if (!o.company.toLowerCase().includes(q) && !matchesAddress) return false;
      }
      return true;
    });
  }, [opportunities, activeStages, filterTeamMember, filterMinCommission, filterSearch, leasesByCompany]);

  const pipelineValue = filteredOpportunities.filter((o) => o.stage !== "Closed Lost").reduce((sum, o) => sum + o.estimatedCommission, 0);
  const closedWonValue = filteredOpportunities.filter((o) => o.stage === "Closed Won").reduce((sum, o) => sum + o.estimatedCommission, 0);
  const activeDeals = filteredOpportunities.filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost").length;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Pipeline summary */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15">
            <DollarSign size={16} className="text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pipeline Value{hasActiveFilters ? " (filtered)" : ""}</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(pipelineValue)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Closed Won</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(closedWonValue)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Deals</p>
            <p className="text-sm font-semibold text-foreground">{activeDeals}</p>
          </div>
        </div>
        <Button size="sm" className="ml-auto gap-1" onClick={() => setAddOpen(true)}>
          <Plus size={14} />
          Add Opportunity
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center rounded-lg border border-input overflow-hidden">
          {stages.map((s) => (
            <button
              key={s.key}
              onClick={() => toggleStage(s.key)}
              className={`px-2 py-1 text-[11px] transition-colors ${
                activeStages.has(s.key)
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Select value={filterTeamMember} onValueChange={(v) => setFilterTeamMember(v ?? "all")}>
          <SelectTrigger className="text-xs h-7 min-w-[140px]">
            <SelectValue placeholder="All Team Members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team Members</SelectItem>
            {TEAM_MEMBERS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="number" placeholder="Min Commission" value={filterMinCommission} onChange={(e) => setFilterMinCommission(e.target.value)} className="w-32 h-7 text-xs" />
        <Input type="text" placeholder="Search company or address..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="w-48 h-7 text-xs" />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1">
            <X size={12} />
            Clear
          </Button>
        )}
        {hasActiveFilters && (
          <span className="text-[11px] text-muted-foreground ml-auto">
            {filteredOpportunities.length} of {opportunities.length} opportunities
          </span>
        )}
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto pb-2">
        <div
          className="gap-3 h-full"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${stages.filter((s) => activeStages.has(s.key)).length}, minmax(220px, 1fr))`,
            minWidth: `${Math.max(stages.filter((s) => activeStages.has(s.key)).length * 220, 600)}px`,
          }}
        >
          {stages.filter((s) => activeStages.has(s.key)).map((stage) => {
            const stageOpps = filteredOpportunities.filter((o) => o.stage === stage.key);
            const stageTotal = stageOpps.reduce((sum, o) => sum + o.estimatedCommission, 0);

            return (
              <div
                key={stage.key}
                className={`flex flex-col gap-2 min-w-[220px] rounded-lg transition-colors ${dragOverStage === stage.key ? "bg-muted/30 ring-2 ring-ring/30" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(stage.key); }}
              >
                <div className={`rounded-lg border px-3 py-2 ${stage.headerBg}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{stageOpps.length}</Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{formatCurrency(stageTotal)}</p>
                </div>

                <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-0.5">
                  {stageOpps.map((opp) => {
                    const companyLeases = leasesByCompany.get(opp.companyId) ?? [];

                    return (
                      <Card
                        key={opp.id}
                        className={`shrink-0 cursor-grab active:cursor-grabbing transition-opacity ${dragId === opp.id ? "opacity-40" : ""}`}
                        draggable
                        onDragStart={() => setDragId(opp.id)}
                        onDragEnd={() => { setDragId(null); setDragOverStage(null); }}
                      >
                        <CardContent className="p-3 space-y-2">
                          {/* Company + edit */}
                          <div className="flex items-start justify-between gap-1">
                            <Link
                              href={`/companies/${opp.companyId}`}
                              className="text-xs font-semibold text-cw-green hover:underline leading-tight"
                            >
                              {opp.company}
                            </Link>
                            <button
                              onClick={() => {
                                setEditId(opp.id);
                                setEditValues({
                                  company: opp.company, companyId: opp.companyId,
                                  contact: opp.contact, contactId: opp.contactId,
                                  stage: opp.stage, squareFootage: opp.squareFootage,
                                  targetMoveDate: opp.targetMoveDate,
                                  estimatedCommission: opp.estimatedCommission,
                                  notes: opp.notes, teamMembers: opp.teamMembers ?? [],
                                });
                                setEditOpen(true);
                              }}
                              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            >
                              <Pencil size={10} />
                            </button>
                          </div>

                          {/* Lease addresses */}
                          {companyLeases.length > 0 ? (
                            <div className="space-y-1.5">
                              {companyLeases.map((lease) => (
                                <div key={lease.id} className="rounded-md border border-border/50 bg-muted/20 px-2 py-1.5">
                                  <div className="flex items-center gap-1">
                                    <MapPin size={10} className="text-muted-foreground shrink-0" />
                                    <Link
                                      href={`/buildings/${lease.buildingId}`}
                                      className="text-[11px] text-cw-blue hover:underline truncate"
                                    >
                                      {lease.address}
                                    </Link>
                                  </div>
                                  <div className="flex items-center justify-between mt-1 gap-2">
                                    <span className="text-[10px] text-muted-foreground">{lease.suites}</span>
                                    <span className="text-[10px] text-muted-foreground">{lease.squareFootage.toLocaleString()} SF</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-0.5 gap-2">
                                    <span className="text-[10px] text-muted-foreground">Exp: {lease.leaseExpiration || "—"}</span>
                                    <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${leaseStatusColor[lease.status] ?? leaseStatusColor["Active"]}`}>
                                      {lease.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                              <Building2 size={10} />
                              No leases on file
                            </div>
                          )}

                          {/* Commission + SF + target */}
                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            <span className="text-[10px] text-muted-foreground">{opp.squareFootage.toLocaleString()} SF req</span>
                            <span className="text-[10px] font-medium text-foreground">{formatCurrency(opp.estimatedCommission)}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Target: {opp.targetMoveDate}</p>

                          {/* Notes */}
                          {opp.notes && (
                            <p className="text-[10px] text-muted-foreground/70 leading-tight line-clamp-3">
                              {opp.notes}
                            </p>
                          )}

                          {/* Team */}
                          {(opp.teamMembers ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {opp.teamMembers.map((m) => (
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
                  {stageOpps.length === 0 && (
                    <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border/50 p-4">
                      <p className="text-[10px] text-muted-foreground">No opportunities</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EditDialog open={addOpen} onOpenChange={setAddOpen} title="Add Opportunity" fields={opportunityFields} values={{ teamMembers: [] }} onSave={(formValues) => { addOpportunity({ ...formValues, id: genId("o") } as any); }} />
      <EditDialog open={editOpen} onOpenChange={setEditOpen} title="Edit Opportunity" fields={opportunityFields} values={editValues} onSave={(formValues) => { if (editId) updateOpportunity(editId, formValues as any); }} />
    </div>
  );
}
