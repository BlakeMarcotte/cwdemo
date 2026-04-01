"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, Ban, Plus, Search, X } from "lucide-react";
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { TEAM_MEMBERS } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

type SortKey = "name" | "mainPhone" | "city" | "state" | "relationship" | "industry" | "locations" | "msaExpiration" | "doNotContact" | null;
type SortDir = "asc" | "desc";

const relationshipColor: Record<string, string> = {
  Prospect:
    "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Client:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Past Client":
    "bg-muted text-muted-foreground border-border",
  Vendor:
    "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Competitor:
    "bg-red-500/15 text-red-400 border-red-500/30",
  "Active Pursuit":
    "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Passive Pursuit":
    "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

const companyFields: FieldDef[] = [
  { key: "name", label: "Company Name", type: "text", placeholder: "Acme Corp" },
  { key: "mainPhone", label: "Main Phone", type: "text", placeholder: "(312) 555-0000" },
  { key: "website", label: "Website", type: "text", placeholder: "www.example.com" },
  { key: "hqAddress", label: "HQ Address", type: "text", placeholder: "123 Main St" },
  { key: "city", label: "City", type: "text", placeholder: "Chicago" },
  { key: "state", label: "State", type: "text", placeholder: "IL" },
  {
    key: "relationship",
    label: "Relationship",
    type: "multi-select",
    options: ["Prospect", "Client", "Past Client", "Vendor", "Competitor", "Active Pursuit", "Passive Pursuit"],
  },
  { key: "linkedIn", label: "LinkedIn", type: "text", placeholder: "https://linkedin.com/company/..." },
  {
    key: "industry",
    label: "Industry",
    type: "select",
    options: [
      "Real Estate",
      "Insurance",
      "Technology",
      "Life Science",
      "Quantum Computing",
      "Financial Services",
      "Legal",
      "Wealth Management",
    ],
  },
  { key: "locations", label: "Locations", type: "number", placeholder: "1" },
  { key: "msaBrokerage", label: "MSA Brokerage", type: "text", placeholder: "Broker name" },
  { key: "msaExpiration", label: "MSA Expiration", type: "date" },
  { key: "spocContact", label: "SPOC Contact", type: "text", placeholder: "Contact name" },
  { key: "doNotContact", label: "Do Not Contact", type: "checkbox" },
  { key: "teamMembers", label: "Team", type: "multi-select", options: TEAM_MEMBERS },
];

const emptyCompany: Record<string, unknown> = {
  name: "",
  mainPhone: "",
  website: "",
  hqAddress: "",
  city: "",
  state: "",
  relationship: [],
  linkedIn: "",
  industry: "",
  locations: 0,
  msaBrokerage: "",
  msaExpiration: "",
  spocContact: "",
  doNotContact: false,
  teamMembers: [],
};

export default function CompaniesPage() {
  const { companies, addCompany } = useData();
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [addOpen, setAddOpen] = useState(false);

  // Filter state
  const [relationshipFilter, setRelationshipFilter] = useState<string[]>([]);
  const [industryFilter, setIndustryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Derived filter options from data
  const industries = useMemo(
    () => [...new Set(companies.map((c) => c.industry).filter(Boolean))].sort(),
    [companies],
  );
  const cities = useMemo(
    () => [...new Set(companies.map((c) => c.city).filter(Boolean))].sort(),
    [companies],
  );

  const RELATIONSHIP_OPTIONS = ["Prospect", "Client", "Past Client", "Vendor", "Competitor", "Active Pursuit", "Passive Pursuit"];

  function toggleRelationship(r: string) {
    setRelationshipFilter((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  }

  const hasActiveFilters =
    relationshipFilter.length > 0 ||
    industryFilter !== "" ||
    cityFilter !== "" ||
    teamFilter !== "" ||
    searchQuery !== "";

  function clearFilters() {
    setRelationshipFilter([]);
    setIndustryFilter("");
    setCityFilter("");
    setTeamFilter("");
    setSearchQuery("");
  }

  // Apply filters before sorting
  const filtered = useMemo(() => {
    return companies.filter((c) => {
      // Relationship filter — if any selected, company must have at least one match
      if (
        relationshipFilter.length > 0 &&
        !c.relationship.some((r) => relationshipFilter.includes(r))
      )
        return false;
      // Industry filter
      if (industryFilter && c.industry !== industryFilter) return false;
      // City filter
      if (cityFilter && c.city !== cityFilter) return false;
      // Team member filter — check spocContact array
      if (teamFilter && !(c.spocContact ?? []).includes(teamFilter)) return false;
      // Search by company name
      if (
        searchQuery &&
        !c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [companies, relationshipFilter, industryFilter, cityFilter, teamFilter, searchQuery]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      if (typeof av === "boolean" && typeof bv === "boolean") {
        return sortDir === "asc"
          ? Number(av) - Number(bv)
          : Number(bv) - Number(av);
      }
      const sa = Array.isArray(av) ? av.join(", ") : String(av);
      const sb = Array.isArray(bv) ? bv.join(", ") : String(bv);
      return sortDir === "asc"
        ? sa.localeCompare(sb)
        : sb.localeCompare(sa);
    });
  }, [filtered, sortKey, sortDir]);

  function handleAddSave(formValues: Record<string, unknown>) {
    const msaBrokerage = formValues.msaBrokerage
      ? String(formValues.msaBrokerage).split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const spocContact = formValues.spocContact
      ? String(formValues.spocContact).split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    addCompany({
      ...(formValues as Record<string, unknown> & { name: string; mainPhone: string; website: string; hqAddress: string; city: string; state: string; relationship: string[]; linkedIn: string; industry: string; locations: number; doNotContact: boolean }),
      id: genId("c"),
      msaBrokerage,
      spocContact,
      msaExpiration: formValues.msaExpiration ? String(formValues.msaExpiration) : null,
    } as Parameters<typeof addCompany>[0]);
  }

  function SortHeader({
    label,
    field,
  }: {
    label: string;
    field: SortKey;
  }) {
    return (
      <TableHead
        className="cursor-pointer select-none text-xs px-2 py-1.5"
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown size={12} className="text-muted-foreground" />
        </span>
      </TableHead>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Companies</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} className="mr-1.5" />
          Add Company
        </Button>
      </div>

      <EditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Company"
        fields={companyFields}
        values={emptyCompany}
        onSave={handleAddSave}
      />

      {/* Filter bar */}
      <div className="rounded-lg border border-border bg-card/50 px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Relationship toggle pills */}
          <span className="text-xs text-muted-foreground mr-0.5">Relationship:</span>
          {RELATIONSHIP_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => toggleRelationship(r)}
              className={`inline-flex items-center rounded-md border px-2 h-7 text-xs font-medium transition-colors ${
                relationshipFilter.includes(r)
                  ? (relationshipColor[r] ?? "bg-accent text-accent-foreground border-border")
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {r}
            </button>
          ))}

          <div className="h-5 w-px bg-border mx-1" />

          {/* Industry dropdown */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          {/* City dropdown */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Team Member dropdown */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="">All Team Members</option>
            {TEAM_MEMBERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

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
          Showing {filtered.length} of {companies.length} companies
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollableTable>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortHeader label="Company" field="name" />
              <SortHeader label="Main Phone" field="mainPhone" />
              <TableHead className="text-xs px-2 py-1.5">Website</TableHead>
              <SortHeader label="City" field="city" />
              <SortHeader label="State" field="state" />
              <SortHeader label="Relationship" field="relationship" />
              <SortHeader label="Industry" field="industry" />
              <SortHeader label="Locations" field="locations" />
              <TableHead className="text-xs px-2 py-1.5">MSA Brokerage</TableHead>
              <SortHeader label="MSA Expiration" field="msaExpiration" />
              <TableHead className="text-xs px-2 py-1.5">SPOC Contact</TableHead>
              <SortHeader label="Do Not Contact" field="doNotContact" />
              <TableHead className="text-xs px-2 py-1.5">Team</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id}>
                {/* Company name — green linked record */}
                <TableCell className="text-xs px-2 py-1.5 font-medium">
                  <Link
                    href={`/companies/${c.id}`}
                    className="text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    {c.name}
                  </Link>
                </TableCell>

                <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                  {c.mainPhone}
                </TableCell>

                {/* Website — blue external link, truncated */}
                <TableCell className="text-xs px-2 py-1.5 max-w-[140px]">
                  {c.website ? (
                    <a
                      href={
                        c.website.startsWith("http")
                          ? c.website
                          : `https://${c.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline truncate block"
                      title={c.website}
                    >
                      {c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    </a>
                  ) : null}
                </TableCell>

                <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                  {c.city}
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                  {c.state}
                </TableCell>

                {/* Relationship badges */}
                <TableCell className="text-xs px-2 py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {c.relationship.map((r) => (
                      <Badge
                        key={r}
                        variant="outline"
                        className={relationshipColor[r] ?? ""}
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </TableCell>

                <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                  {c.industry}
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5 text-muted-foreground text-right">
                  {c.locations}
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                  {c.msaBrokerage.length > 0
                    ? c.msaBrokerage.join(", ")
                    : "\u2014"}
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                  {c.msaExpiration ?? "\u2014"}
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                  {c.spocContact.length > 0
                    ? c.spocContact.join(", ")
                    : "\u2014"}
                </TableCell>

                {/* Do Not Contact */}
                <TableCell className="text-xs px-2 py-1.5">
                  {c.doNotContact && (
                    <Badge
                      variant="outline"
                      className="bg-red-500/15 text-red-400 border-red-500/30"
                    >
                      <Ban size={10} className="mr-1" />
                      DNC
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {(c.teamMembers ?? []).map((m) => (
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
