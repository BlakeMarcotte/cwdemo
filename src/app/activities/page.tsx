"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Search,
  Pin,
  PinOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { ActivityType, TaskStatus } from "@/lib/data";

// ---------------------------------------------------------------------------
// Styling maps
// ---------------------------------------------------------------------------

const typeBadge: Record<ActivityType, string> = {
  Call: "bg-blue-500/20 text-blue-300",
  Meeting: "bg-purple-500/20 text-purple-300",
  Update: "bg-muted text-muted-foreground",
};

const priorityBadge: Record<string, string> = {
  High: "bg-red-500/20 text-red-300",
  Medium: "bg-yellow-500/20 text-yellow-300",
  Low: "bg-green-500/20 text-green-300",
};

const statusIcon: Record<TaskStatus, typeof Circle> = {
  "To Do": Circle,
  "In Progress": Clock,
  Done: CheckCircle2,
};

const statusColor: Record<TaskStatus, string> = {
  "To Do": "text-muted-foreground",
  "In Progress": "text-blue-400",
  Done: "text-green-400",
};

// ---------------------------------------------------------------------------
// Sort / filter types
// ---------------------------------------------------------------------------

type SortKey =
  | "status"
  | "type"
  | "date"
  | "time"
  | "priority"
  | "contact"
  | "company"
  | "regarding"
  | "dueDate";
type SortDir = "asc" | "desc";
type FilterType = "All" | ActivityType;
type FilterStatus = "All" | TaskStatus;

function parseDate(d: string): number {
  if (!d) return 0;
  const parts = d.split("/");
  if (parts.length === 3) {
    return new Date(
      `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
    ).getTime();
  }
  return new Date(d).getTime();
}

const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
const statusOrder: Record<string, number> = {
  "In Progress": 0,
  "To Do": 1,
  Done: 2,
};

// ---------------------------------------------------------------------------
// Field definitions for Add / Edit dialog
// ---------------------------------------------------------------------------

const activityFields: FieldDef[] = [
  {
    key: "type",
    label: "Type",
    type: "select",
    options: ["Call", "Update", "Meeting"],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["To Do", "In Progress", "Done"],
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: ["High", "Medium", "Low"],
  },
  { key: "date", label: "Date", type: "date" },
  { key: "time", label: "Time", type: "text", placeholder: "HH:MM" },
  { key: "dueDate", label: "Due Date", type: "date" },
  { key: "regarding", label: "Regarding", type: "textarea" },
  { key: "contact", label: "Contact", type: "text" },
  { key: "contactId", label: "Contact ID", type: "text" },
  { key: "company", label: "Company", type: "text" },
  { key: "companyId", label: "Company ID", type: "text" },
  { key: "officePhone", label: "Office Phone", type: "text" },
  { key: "ext", label: "Ext", type: "number" },
  { key: "mobilePhone", label: "Mobile Phone", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "addDate", label: "Add Date", type: "date" },
  {
    key: "teamMembers",
    label: "Team",
    type: "multi-select",
    options: TEAM_MEMBERS,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActivitiesPage() {
  const { activities, addActivity, updateActivity, deleteActivity } = useData();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("All");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("All");
  const [filterPriority, setFilterPriority] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [filterTeamMember, setFilterTeamMember] = useState<string>("All");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "dueDate" ? "desc" : "asc");
    }
  }

  // Derived counts
  const pinnedCount = activities.filter((a) => a.pinned).length;
  const todoCount = activities.filter((a) => a.status === "To Do").length;
  const inProgressCount = activities.filter(
    (a) => a.status === "In Progress"
  ).length;
  const doneCount = activities.filter((a) => a.status === "Done").length;

  const filtered = useMemo(() => {
    let list = [...activities];
    if (filterType !== "All") list = list.filter((a) => a.type === filterType);
    if (filterStatus !== "All")
      list = list.filter((a) => a.status === filterStatus);
    if (filterPriority !== "All")
      list = list.filter((a) => a.priority === filterPriority);
    if (filterTeamMember !== "All")
      list = list.filter((a) => (a.teamMembers ?? []).includes(filterTeamMember));
    if (filterDateFrom) {
      const fromTs = new Date(filterDateFrom).getTime();
      list = list.filter((a) => a.date && parseDate(a.date) >= fromTs);
    }
    if (filterDateTo) {
      const toTs = new Date(filterDateTo).getTime() + 86400000 - 1;
      list = list.filter((a) => a.date && parseDate(a.date) <= toTs);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.contact.toLowerCase().includes(q) ||
          a.regarding.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "status":
          cmp =
            (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
          if (cmp === 0)
            cmp =
              (priorityOrder[a.priority] ?? 9) -
              (priorityOrder[b.priority] ?? 9);
          break;
        case "date":
          cmp = parseDate(a.date) - parseDate(b.date);
          break;
        case "dueDate":
          cmp = parseDate(a.dueDate) - parseDate(b.dueDate);
          break;
        case "time":
          cmp = a.time.localeCompare(b.time);
          break;
        case "priority":
          cmp = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "contact":
          cmp = a.contact.localeCompare(b.contact);
          break;
        case "company":
          cmp = a.company.localeCompare(b.company);
          break;
        case "regarding":
          cmp = a.regarding.localeCompare(b.regarding);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [activities, filterType, filterStatus, filterPriority, filterTeamMember, filterDateFrom, filterDateTo, searchQuery, sortKey, sortDir]);

  function openEdit(a: (typeof activities)[number]) {
    setEditId(a.id);
    setEditValues({
      type: a.type,
      status: a.status,
      priority: a.priority,
      date: a.date,
      time: a.time,
      dueDate: a.dueDate,
      regarding: a.regarding,
      contact: a.contact,
      contactId: a.contactId,
      company: a.company,
      companyId: a.companyId,
      officePhone: a.officePhone,
      ext: a.ext ?? 0,
      mobilePhone: a.mobilePhone,
      email: a.email,
      addDate: a.addDate,
      teamMembers: a.teamMembers ?? [],
    });
    setEditOpen(true);
  }

  const typeFilters: { label: string; value: FilterType }[] = [
    { label: "All Types", value: "All" },
    { label: "Calls", value: "Call" },
    { label: "Meetings", value: "Meeting" },
    { label: "Updates", value: "Update" },
  ];

  const statusFilters: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "All" },
    { label: "To Do", value: "To Do" },
    { label: "In Progress", value: "In Progress" },
    { label: "Done", value: "Done" },
  ];

  function SortButton({
    label,
    field,
  }: {
    label: string;
    field: SortKey;
  }) {
    return (
      <button
        onClick={() => toggleSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown
          size={12}
          className={
            sortKey === field
              ? "text-cw-green"
              : "text-muted-foreground/50"
          }
        />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Circle size={18} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">To Do</p>
              <p className="text-lg font-bold text-foreground">{todoCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
              <Clock size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">In Progress</p>
              <p className="text-lg font-bold text-foreground">
                {inProgressCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/15">
              <CheckCircle2 size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Done</p>
              <p className="text-lg font-bold text-foreground">{doneCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bars */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          {statusFilters.map((f) => (
            <Button
              key={f.value}
              variant={filterStatus === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(f.value)}
            >
              {f.label}
            </Button>
          ))}
          <span className="w-px h-5 bg-border mx-1" />
          {/* Type filter */}
          {typeFilters.map((f) => (
            <Button
              key={f.value}
              variant={filterType === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(f.value)}
            >
              {f.label}
            </Button>
          ))}
          <span className="w-px h-5 bg-border mx-1" />
          {/* Priority filter */}
          {(["All", "High", "Medium", "Low"] as const).map((p) => (
            <Button
              key={p}
              variant={filterPriority === p ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPriority(p)}
            >
              {p === "All" ? "All Priorities" : p}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Team Member dropdown */}
          <select
            value={filterTeamMember}
            onChange={(e) => setFilterTeamMember(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Team Members</option>
            {TEAM_MEMBERS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">From</span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">To</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search company, contact, regarding..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-64 rounded-md border border-border bg-background pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} activities
          </span>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => setAddOpen(true)}
          >
            <Plus size={14} />
            Add Activity
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollableTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <SortButton label="" field="status" />
              </TableHead>
              <TableHead className="w-[70px]">
                <SortButton label="Type" field="type" />
              </TableHead>
              <TableHead className="w-[75px]">
                <SortButton label="Priority" field="priority" />
              </TableHead>
              <TableHead className="w-[90px]">
                <SortButton label="Date" field="date" />
              </TableHead>
              <TableHead className="w-[90px]">
                <SortButton label="Due" field="dueDate" />
              </TableHead>
              <TableHead>
                <SortButton label="Contact" field="contact" />
              </TableHead>
              <TableHead>
                <SortButton label="Company" field="company" />
              </TableHead>
              <TableHead className="min-w-[250px]">
                <SortButton label="Regarding" field="regarding" />
              </TableHead>
              <TableHead className="w-[130px]">Office Phone</TableHead>
              <TableHead className="w-[130px]">Mobile</TableHead>
              <TableHead className="w-[170px]">Email</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="w-[40px] text-center">
                <Pin size={12} className="mx-auto text-muted-foreground/50" />
              </TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((activity) => {
              const StatusIcon = statusIcon[activity.status] ?? Circle;
              return (
                <TableRow key={activity.id}>
                  {/* Status icon — click to cycle */}
                  <TableCell>
                    <button
                      className="p-0.5"
                      onClick={() => {
                        const next: Record<TaskStatus, TaskStatus> = {
                          "To Do": "In Progress",
                          "In Progress": "Done",
                          Done: "To Do",
                        };
                        updateActivity(activity.id, {
                          status: next[activity.status],
                        });
                      }}
                    >
                      <StatusIcon
                        size={16}
                        className={statusColor[activity.status]}
                      />
                    </button>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge
                      className={`${typeBadge[activity.type]} border-0 text-[10px] px-1.5`}
                    >
                      {activity.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge
                      className={`${priorityBadge[activity.priority]} border-0 text-[10px] px-1.5`}
                    >
                      {activity.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {activity.date}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {activity.dueDate || "\u2014"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {activity.contactId ? (
                      <Link
                        href={`/contacts/${activity.contactId}`}
                        className="text-cw-green hover:underline"
                      >
                        {activity.contact}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        {activity.contact || "\u2014"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {activity.companyId ? (
                      <Link
                        href={`/companies/${activity.companyId}`}
                        className="text-cw-green hover:underline"
                      >
                        {activity.company}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        {activity.company || "\u2014"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-xs max-w-[350px] truncate ${activity.status === "Done" ? "text-muted-foreground/50 line-through" : "text-muted-foreground"}`}
                  >
                    {activity.regarding}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.officePhone}
                    {activity.ext ? ` x${activity.ext}` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.mobilePhone}
                  </TableCell>
                  <TableCell className="text-xs">
                    {activity.email ? (
                      <a
                        href={`mailto:${activity.email}`}
                        className="text-cw-blue hover:underline"
                      >
                        {activity.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{"\u2014"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(activity.teamMembers ?? []).map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0 text-[10px] text-indigo-400"
                        >
                          {m.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => {
                        if (!activity.pinned && pinnedCount >= 10) return;
                        updateActivity(activity.id, { pinned: !activity.pinned });
                      }}
                      className={`rounded p-1 transition-colors ${
                        activity.pinned
                          ? "text-amber-400 hover:text-muted-foreground"
                          : pinnedCount >= 10
                            ? "text-muted-foreground/20 cursor-not-allowed"
                            : "text-muted-foreground/40 hover:text-amber-400"
                      }`}
                      title={
                        activity.pinned
                          ? "Remove from To-Do list"
                          : pinnedCount >= 10
                            ? "To-Do list is full (max 10)"
                            : "Add to To-Do list"
                      }
                    >
                      {activity.pinned ? <Pin size={14} /> : <PinOff size={14} />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(activity)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deleteActivity(activity.id)}
                        className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </ScrollableTable>
      </div>

      {/* Add Activity Dialog */}
      <EditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Activity"
        fields={activityFields}
        values={{ status: "To Do", priority: "Medium", teamMembers: [] }}
        onSave={(formValues) => {
          addActivity({
            ...formValues,
            id: genId("a"),
            pinned: false,
            addDate:
              formValues.addDate ||
              new Date().toLocaleDateString("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
              }),
          } as any);
        }}
      />

      {/* Edit Activity Dialog */}
      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Activity"
        fields={activityFields}
        values={editValues}
        onSave={(formValues) => {
          if (editId) updateActivity(editId, formValues as any);
        }}
      />
    </div>
  );
}
