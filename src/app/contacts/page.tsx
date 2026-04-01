"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { ArrowUpDown, Plus, Building2, ClipboardList, Search } from "lucide-react";
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
import { ScrollableTable } from "@/components/ui/scrollable-table";
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
  const [designationFilter, setDesignationFilter] = useState<Set<string>>(new Set());
  const [companyFilter, setCompanyFilter] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [quickActOpen, setQuickActOpen] = useState(false);
  const [quickActDefaults, setQuickActDefaults] = useState<Record<string, unknown>>({});

  // Unique companies and locations from contacts
  const uniqueCompanies = useMemo(() => {
    const set = new Set(contacts.map((c) => c.company));
    return Array.from(set).sort();
  }, [contacts]);

  const uniqueLocations = useMemo(() => {
    const set = new Set(contacts.map((c) => c.location).filter(Boolean));
    return Array.from(set).sort();
  }, [contacts]);

  function toggleDesignation(d: string) {
    setDesignationFilter((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let list = [...contacts];
    if (buildingFilter !== "all") {
      const companyIds = new Set(
        leases.filter((l) => l.buildingId === buildingFilter).map((l) => l.companyId)
      );
      list = list.filter((c) => companyIds.has(c.companyId));
    }
    if (designationFilter.size > 0) {
      list = list.filter((c) =>
        c.designation.some((d) => designationFilter.has(d))
      );
    }
    if (companyFilter !== "All") {
      list = list.filter((c) => c.company === companyFilter);
    }
    if (locationFilter !== "All") {
      list = list.filter((c) => c.location === locationFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q)
      );
    }
    return list;
  }, [contacts, leases, buildingFilter, designationFilter, companyFilter, locationFilter, searchQuery]);

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
      <div className="flex flex-col gap-2">
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
              {filtered.length}{buildingFilter !== "all" || designationFilter.size > 0 || companyFilter !== "All" || locationFilter !== "All" || searchQuery.trim() ? ` of ${contacts.length}` : ""} contacts
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Designation toggle buttons */}
          <span className="text-xs text-muted-foreground mr-1">Designation:</span>
          {["Decision Maker", "Influencer", "Coordinator", "End User"].map((d) => (
            <Button
              key={d}
              variant={designationFilter.has(d) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDesignation(d)}
            >
              {d}
            </Button>
          ))}
          <span className="w-px h-5 bg-border mx-1" />
          {/* Company dropdown */}
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Companies</option>
            {uniqueCompanies.map((co) => (
              <option key={co} value={co}>{co}</option>
            ))}
          </select>
          {/* Location dropdown */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Locations</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, email, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-56 rounded-md border border-border bg-background pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
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

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollableTable>
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
        </ScrollableTable>
      </div>
    </div>
  );
}
