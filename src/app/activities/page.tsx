"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, Plus } from "lucide-react";
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
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { TEAM_MEMBERS } from "@/lib/data";
import type { ActivityType } from "@/lib/data";

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

type SortKey =
  | "type"
  | "date"
  | "time"
  | "priority"
  | "contact"
  | "company"
  | "regarding";
type SortDir = "asc" | "desc";

function parseDate(d: string): number {
  // Handle MM/DD/YYYY format
  const parts = d.split("/");
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`).getTime();
  }
  return new Date(d).getTime();
}

const priorityOrder: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const activityFields: FieldDef[] = [
  { key: "type", label: "Type", type: "select", options: ["Call", "Update", "Meeting"] },
  { key: "date", label: "Date", type: "date" },
  { key: "time", label: "Time", type: "text", placeholder: "HH:MM" },
  { key: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low"] },
  { key: "contact", label: "Contact", type: "text" },
  { key: "contactId", label: "Contact ID", type: "text" },
  { key: "company", label: "Company", type: "text" },
  { key: "companyId", label: "Company ID", type: "text" },
  { key: "officePhone", label: "Office Phone", type: "text" },
  { key: "ext", label: "Ext", type: "number" },
  { key: "mobilePhone", label: "Mobile Phone", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "regarding", label: "Regarding", type: "textarea" },
  { key: "addDate", label: "Add Date", type: "date" },
  { key: "teamMembers", label: "Team", type: "multi-select", options: TEAM_MEMBERS },
];

export default function ActivitiesPage() {
  const { activities, addActivity } = useData();

  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<"All" | ActivityType>("All");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let list = [...activities];
    if (filter !== "All") {
      list = list.filter((a) => a.type === filter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp = parseDate(a.date) - parseDate(b.date);
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
  }, [activities, filter, sortKey, sortDir]);

  const filters: { label: string; value: "All" | ActivityType }[] = [
    { label: "All", value: "All" },
    { label: "Calls", value: "Call" },
    { label: "Meetings", value: "Meeting" },
    { label: "Updates", value: "Update" },
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
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
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

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70px]">
              <SortButton label="Type" field="type" />
            </TableHead>
            <TableHead className="w-[90px]">
              <SortButton label="Date" field="date" />
            </TableHead>
            <TableHead className="w-[75px]">
              <SortButton label="Time" field="time" />
            </TableHead>
            <TableHead className="w-[75px]">
              <SortButton label="Priority" field="priority" />
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
            <TableHead className="w-[180px]">Email</TableHead>
            <TableHead>Team</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell className="text-xs">
                <Badge
                  className={`${typeBadge[activity.type]} border-0 text-[10px] px-1.5`}
                >
                  {activity.type}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {activity.date}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {activity.time}
              </TableCell>
              <TableCell className="text-xs">
                <Badge
                  className={`${priorityBadge[activity.priority]} border-0 text-[10px] px-1.5`}
                >
                  {activity.priority}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                <Link
                  href={`/contacts/${activity.contactId}`}
                  className="text-cw-green hover:underline"
                >
                  {activity.contact}
                </Link>
              </TableCell>
              <TableCell className="text-xs">
                <Link
                  href={`/companies/${activity.companyId}`}
                  className="text-cw-green hover:underline"
                >
                  {activity.company}
                </Link>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[350px] truncate">
                {activity.regarding}
              </TableCell>
              <TableCell className="text-xs">
                <a
                  href={`mailto:${activity.email}`}
                  className="text-cw-blue hover:underline"
                >
                  {activity.email}
                </a>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {(activity.teamMembers ?? []).map((m) => (
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

      {/* Add Activity Dialog */}
      <EditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Activity"
        fields={activityFields}
        values={{ teamMembers: [] }}
        onSave={(formValues) => {
          addActivity({ ...formValues, id: genId("a") } as any);
        }}
      />
    </div>
  );
}
