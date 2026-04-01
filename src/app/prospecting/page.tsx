"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Target,
  Users,
  MessageSquare,
  Clock,
  AlertTriangle,
  ChevronUp,
  Sparkles,
  Plus,
  Pencil,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { TEAM_MEMBERS } from "@/lib/data";
import type { ProspectStatus } from "@/lib/data";

const TODAY = new Date("2026-04-01");

const statusBadge: Record<ProspectStatus, string> = {
  Active: "bg-green-500/20 text-green-300",
  "Cooling Off": "bg-yellow-500/20 text-yellow-300",
  Responded: "bg-blue-500/20 text-blue-300",
  "Not Interested": "bg-red-500/20 text-red-300",
};

const prospectFields: FieldDef[] = [
  { key: "company", label: "Company", type: "text" },
  { key: "companyId", label: "Company ID", type: "text" },
  { key: "industry", label: "Industry", type: "text" },
  { key: "nugget", label: "Nugget", type: "textarea" },
  { key: "lastContactDate", label: "Last Contact Date", type: "date" },
  { key: "nextFollowUpDate", label: "Next Follow-up Date", type: "date" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Active", "Cooling Off", "Responded", "Not Interested"],
  },
  {
    key: "teamLead",
    label: "Team Lead",
    type: "select",
    options: ["Michael Madden", "Tate Surtani", "Lily Chen", "Jonathan Metzel"],
  },
  {
    key: "list",
    label: "List",
    type: "select",
    options: ["focus", "reserve"],
  },
  { key: "teamMembers", label: "Team", type: "multi-select", options: TEAM_MEMBERS },
];

function parseDate(d: string): Date {
  // Handle MM/DD/YYYY format
  const parts = d.split("/");
  if (parts.length === 3) {
    return new Date(
      `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
    );
  }
  return new Date(d);
}

function isOverdue(dateStr: string): boolean {
  return parseDate(dateStr) < TODAY;
}

function daysSince(dateStr: string): number {
  const d = parseDate(dateStr);
  return Math.floor((TODAY.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return dateStr;
}

export default function ProspectingPage() {
  const { prospects, addProspect, updateProspect } = useData();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<"All" | ProspectStatus>("All");
  const [filterTeamLead, setFilterTeamLead] = useState<string>("All");
  const [filterIndustry, setFilterIndustry] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Unique industries from data
  const industries = useMemo(() => {
    const set = new Set(prospects.map((p) => p.industry));
    return Array.from(set).sort();
  }, [prospects]);

  // Apply filters to all prospects, then split into focus/reserve
  const filteredProspects = useMemo(() => {
    let list = [...prospects];
    if (filterStatus !== "All") list = list.filter((p) => p.status === filterStatus);
    if (filterTeamLead !== "All") list = list.filter((p) => p.teamLead === filterTeamLead);
    if (filterIndustry !== "All") list = list.filter((p) => p.industry === filterIndustry);
    if (overdueOnly) list = list.filter((p) => isOverdue(p.nextFollowUpDate));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.company.toLowerCase().includes(q) ||
          p.nugget.toLowerCase().includes(q)
      );
    }
    return list;
  }, [prospects, filterStatus, filterTeamLead, filterIndustry, overdueOnly, searchQuery]);

  const focusList = useMemo(
    () => filteredProspects.filter((p) => p.list === "focus"),
    [filteredProspects]
  );
  const reserveList = useMemo(
    () => filteredProspects.filter((p) => p.list === "reserve"),
    [filteredProspects]
  );

  // Stats
  const totalProspects = prospects.length;
  const activeCount = prospects.filter(
    (p) => p.status === "Active"
  ).length;
  const respondedCount = prospects.filter(
    (p) => p.status === "Responded"
  ).length;
  const avgDaysSinceContact = totalProspects > 0
    ? Math.round(
        prospects.reduce((sum, p) => sum + daysSince(p.lastContactDate), 0) /
          totalProspects
      )
    : 0;

  function openEdit(prospect: typeof prospects[number]) {
    setEditId(prospect.id);
    setEditValues({
      company: prospect.company,
      companyId: prospect.companyId,
      industry: prospect.industry,
      nugget: prospect.nugget,
      lastContactDate: prospect.lastContactDate,
      nextFollowUpDate: prospect.nextFollowUpDate,
      status: prospect.status,
      teamLead: prospect.teamLead,
      list: prospect.list,
      teamMembers: prospect.teamMembers ?? [],
    });
    setEditOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cw-blue/15">
              <Users size={18} className="text-cw-blue" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                Total Prospects
              </p>
              <p className="text-lg font-bold text-foreground">
                {totalProspects}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/15">
              <Target size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Active</p>
              <p className="text-lg font-bold text-foreground">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
              <MessageSquare size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Responded</p>
              <p className="text-lg font-bold text-foreground">
                {respondedCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
              <Clock size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                Avg Days Since Contact
              </p>
              <p className="text-lg font-bold text-foreground">
                {avgDaysSinceContact}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          {(["All", "Active", "Cooling Off", "Responded", "Not Interested"] as const).map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(s)}
            >
              {s === "All" ? "All Statuses" : s}
            </Button>
          ))}
          <span className="w-px h-5 bg-border mx-1" />
          {/* Overdue Only toggle */}
          <Button
            variant={overdueOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setOverdueOnly((v) => !v)}
            className={overdueOnly ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            <AlertTriangle size={12} className="mr-1" />
            Overdue Only
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Team Lead dropdown */}
          <select
            value={filterTeamLead}
            onChange={(e) => setFilterTeamLead(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Team Leads</option>
            {TEAM_MEMBERS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {/* Industry dropdown */}
          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search company or nugget..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-64 rounded-md border border-border bg-background pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredProspects.length} of {prospects.length} prospects
          </span>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => setAddOpen(true)}
          >
            <Plus size={14} />
            Add Prospect
          </Button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Focus List                                                         */}
      {/* ================================================================== */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">
              Focus List
            </h3>
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
            {focusList.length}
          </Badge>
          <p className="text-[11px] text-muted-foreground ml-1">
            Curated prospects with active engagement and near-term opportunity
          </p>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <ScrollableTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Company</TableHead>
                <TableHead className="w-[120px]">Industry</TableHead>
                <TableHead className="min-w-[350px]">Nugget</TableHead>
                <TableHead className="w-[100px]">Last Contact</TableHead>
                <TableHead className="w-[110px]">Next Follow-up</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[110px]">Team Lead</TableHead>
                <TableHead className="w-[120px]">Team</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {focusList.map((prospect) => {
                const overdue = isOverdue(prospect.nextFollowUpDate);
                return (
                  <TableRow key={prospect.id}>
                    <TableCell className="text-xs font-medium">
                      <Link
                        href={`/companies/${prospect.companyId}`}
                        className="text-cw-green hover:underline"
                      >
                        {prospect.company}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 border-border/60"
                      >
                        {prospect.industry}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="border-l-2 border-amber-500/50 pl-2.5 py-0.5">
                        <p className="italic text-foreground/90 leading-relaxed">
                          {prospect.nugget}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(prospect.lastContactDate)}
                      <span className="block text-[10px] text-muted-foreground/60">
                        {daysSince(prospect.lastContactDate)}d ago
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={
                          overdue
                            ? "text-red-400 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {formatDate(prospect.nextFollowUpDate)}
                      </span>
                      {overdue && (
                        <span className="flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle size={10} className="text-red-400" />
                          <span className="text-[10px] text-red-400 font-medium">
                            Overdue
                          </span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        className={`${statusBadge[prospect.status]} border-0 text-[10px] px-1.5`}
                      >
                        {prospect.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {prospect.teamLead}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(prospect.teamMembers ?? []).map((m) => (
                          <span key={m} className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0 text-[10px] text-indigo-400">
                            {m.split(" ")[0]}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <button
                        onClick={() => openEdit(prospect)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </ScrollableTable>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Reserve List                                                       */}
      {/* ================================================================== */}
      <section className="opacity-85">
        <div className="mb-3 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Reserve List
          </h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
            {reserveList.length}
          </Badge>
          <p className="text-[11px] text-muted-foreground/70 ml-1">
            Longer-term targets and competitive intelligence
          </p>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <ScrollableTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Company</TableHead>
                <TableHead className="w-[120px]">Industry</TableHead>
                <TableHead className="min-w-[350px]">Nugget</TableHead>
                <TableHead className="w-[100px]">Last Contact</TableHead>
                <TableHead className="w-[110px]">Next Follow-up</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[110px]">Team Lead</TableHead>
                <TableHead className="w-[120px]">Team</TableHead>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reserveList.map((prospect) => {
                const overdue = isOverdue(prospect.nextFollowUpDate);
                return (
                  <TableRow key={prospect.id} className="opacity-90">
                    <TableCell className="text-xs font-medium">
                      <Link
                        href={`/companies/${prospect.companyId}`}
                        className="text-cw-green hover:underline"
                      >
                        {prospect.company}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 border-border/40"
                      >
                        {prospect.industry}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="border-l-2 border-border pl-2.5 py-0.5">
                        <p className="italic text-foreground/70 leading-relaxed">
                          {prospect.nugget}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(prospect.lastContactDate)}
                      <span className="block text-[10px] text-muted-foreground/60">
                        {daysSince(prospect.lastContactDate)}d ago
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={
                          overdue
                            ? "text-red-400 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {formatDate(prospect.nextFollowUpDate)}
                      </span>
                      {overdue && (
                        <span className="flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle size={10} className="text-red-400" />
                          <span className="text-[10px] text-red-400 font-medium">
                            Overdue
                          </span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        className={`${statusBadge[prospect.status]} border-0 text-[10px] px-1.5`}
                      >
                        {prospect.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {prospect.teamLead}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(prospect.teamMembers ?? []).map((m) => (
                          <span key={m} className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0 text-[10px] text-indigo-400">
                            {m.split(" ")[0]}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <button
                        onClick={() => openEdit(prospect)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-[10px] gap-0.5 text-cw-green hover:text-cw-green"
                        onClick={() =>
                          updateProspect(prospect.id, { list: "focus" })
                        }
                      >
                        <ChevronUp size={12} />
                        Focus
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </ScrollableTable>
        </div>
      </section>

      {/* Add Prospect Dialog */}
      <EditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Prospect"
        fields={prospectFields}
        values={{ teamMembers: [] }}
        onSave={(formValues) => {
          addProspect({ ...formValues, id: genId("p") } as any);
        }}
      />

      {/* Edit Prospect Dialog */}
      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Prospect"
        fields={prospectFields}
        values={editValues}
        onSave={(formValues) => {
          if (editId) updateProspect(editId, formValues as any);
        }}
      />
    </div>
  );
}
