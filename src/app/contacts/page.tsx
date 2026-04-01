"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { ArrowUpDown, Plus, Building2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Contact } from "@/lib/data";
import { TEAM_MEMBERS } from "@/lib/data";

type SortKey = keyof Contact;

const designationColor: Record<string, string> = {
  "Decision Maker": "bg-red-500/20 text-red-400 border-red-500/30",
  Influencer: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Coordinator: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "End User": "bg-muted text-muted-foreground border-border",
};

const contactFields: FieldDef[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "company", label: "Company", type: "text" },
  { key: "companyId", label: "Company ID", type: "text", placeholder: "Company ID" },
  { key: "title", label: "Title", type: "text" },
  { key: "contactAddress", label: "Contact Address", type: "text" },
  { key: "officePhone", label: "Office Phone", type: "text" },
  { key: "ext", label: "Ext", type: "number" },
  { key: "mobilePhone", label: "Mobile Phone", type: "text" },
  { key: "email", label: "Email", type: "text" },
  {
    key: "location",
    label: "Location",
    type: "select",
    options: ["Global", "Chicago", "Suburban", "New York", "San Francisco"],
  },
  { key: "linkedIn", label: "LinkedIn", type: "text" },
  {
    key: "designation",
    label: "Designation",
    type: "multi-select",
    options: ["Decision Maker", "Influencer", "Coordinator", "End User"],
  },
  { key: "teamMembers", label: "Team", type: "multi-select", options: TEAM_MEMBERS },
];

const quickActivityFields: FieldDef[] = [
  { key: "regarding", label: "Regarding", type: "textarea" },
  { key: "type", label: "Type", type: "select", options: ["Call", "Update", "Meeting"] },
  { key: "status", label: "Status", type: "select", options: ["To Do", "In Progress", "Done"] },
  { key: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low"] },
  { key: "dueDate", label: "Due Date", type: "date" },
  { key: "teamMembers", label: "Team", type: "multi-select", options: TEAM_MEMBERS },
];

export default function ContactsPage() {
  const { contacts, buildings, leases, addContact, addActivity } = useData();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [quickActOpen, setQuickActOpen] = useState(false);
  const [quickActDefaults, setQuickActDefaults] = useState<Record<string, unknown>>({});

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    if (buildingFilter === "all") return contacts;
    const companyIds = new Set(
      leases.filter((l) => l.buildingId === buildingFilter).map((l) => l.companyId)
    );
    return contacts.filter((c) => companyIds.has(c.companyId));
  }, [contacts, leases, buildingFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));
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
          <h1 className="text-lg font-semibold">Contacts</h1>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" />
            Add Contact
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Building2 size={14} className="text-muted-foreground" />
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.address}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length}{buildingFilter !== "all" ? ` of ${contacts.length}` : ""} contacts
          </span>
        </div>
      </div>

      <EditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Contact"
        fields={contactFields}
        values={{ designation: [] as string[], teamMembers: [] as string[] }}
        onSave={(values) => {
          addContact({ ...values, id: genId("ct") } as Contact);
        }}
      />

      <EditDialog
        open={quickActOpen}
        onOpenChange={setQuickActOpen}
        title="Add Activity"
        fields={quickActivityFields}
        values={quickActDefaults}
        onSave={(formValues) => {
          addActivity({
            ...quickActDefaults,
            ...formValues,
            id: genId("a"),
            date: "",
            time: "",
            addDate: new Date().toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            }),
          } as any);
        }}
      />

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Contact" field="name" />
              <SortHeader label="Company" field="company" />
              <SortHeader label="Title" field="title" />
              <SortHeader label="Office Phone" field="officePhone" />
              <SortHeader label="Ext" field="ext" />
              <SortHeader label="Mobile Phone" field="mobilePhone" />
              <TableHead>Email</TableHead>
              <SortHeader label="Location" field="location" />
              <TableHead>LinkedIn</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs">
                  <Link
                    href={`/contacts/${c.id}`}
                    className="text-cw-green hover:underline font-medium"
                  >
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-xs">
                  <Link
                    href={`/companies/${c.companyId}`}
                    className="text-cw-green hover:underline"
                  >
                    {c.company}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.title}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.officePhone}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.ext ?? ""}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.mobilePhone}
                </TableCell>
                <TableCell className="text-xs">
                  <a
                    href={`mailto:${c.email}`}
                    className="text-cw-blue hover:underline"
                  >
                    {c.email}
                  </a>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.location}
                </TableCell>
                <TableCell className="text-xs">
                  <a
                    href={c.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cw-blue hover:underline"
                  >
                    Profile
                  </a>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {c.designation.map((d) => (
                      <Badge
                        key={d}
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${designationColor[d] ?? ""}`}
                      >
                        {d}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(c.teamMembers ?? []).map((m) => (
                      <span key={m} className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0 text-[10px] text-indigo-400">
                        {m.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    title="Add activity for this contact"
                    onClick={() => {
                      setQuickActDefaults({
                        regarding: `Follow up with ${c.name}`,
                        type: "Call",
                        status: "To Do",
                        priority: "Medium",
                        dueDate: "",
                        teamMembers: [...(c.teamMembers ?? [])],
                        contact: c.name,
                        contactId: c.id,
                        company: c.company,
                        companyId: c.companyId,
                        officePhone: c.officePhone,
                        ext: c.ext,
                        mobilePhone: c.mobilePhone,
                        email: c.email,
                      });
                      setQuickActOpen(true);
                    }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <ClipboardList size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
