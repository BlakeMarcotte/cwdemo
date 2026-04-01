"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useData, genId } from "@/lib/data-context";
import { ArrowUpDown, Plus, X } from "lucide-react";
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
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TEAM_MEMBERS } from "@/lib/data";
import type { Building } from "@/lib/data";

type SortKey = keyof Building;

const classColor: Record<string, string> = {
  A: "bg-green-500/20 text-green-400 border-green-500/30",
  B: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  C: "bg-red-500/20 text-red-400 border-red-500/30",
};

const buildingFields: FieldDef[] = [
  { key: "address", label: "Address", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "zipCode", label: "Zip Code", type: "text" },
  {
    key: "submarket",
    label: "Submarket",
    type: "select",
    options: [
      "Loop",
      "River North",
      "West Loop",
      "Fulton Market",
      "Streeterville",
      "Gold Coast",
      "North Suburbs",
      "West Suburbs",
      "South Suburbs",
    ],
  },
  { key: "squareFootage", label: "Square Footage", type: "number" },
  {
    key: "buildingClass",
    label: "Building Class",
    type: "select",
    options: ["A", "B", "C"],
  },
  { key: "landlord", label: "Landlord", type: "text", placeholder: "Comma-separated" },
  {
    key: "leasingBrokerage",
    label: "Leasing Brokerage",
    type: "text",
    placeholder: "Comma-separated",
  },
  {
    key: "leasingReps",
    label: "Leasing Reps",
    type: "text",
    placeholder: "Comma-separated",
  },
  { key: "teamMembers", label: "Team", type: "multi-select", options: TEAM_MEMBERS },
];

function splitCsv(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  return String(val ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function BuildingsPage() {
  const { buildings, leases, contacts, addBuilding } = useData();
  const [sortKey, setSortKey] = useState<SortKey>("address");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);

  // Filter state
  const [filterSubmarket, setFilterSubmarket] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterLandlord, setFilterLandlord] = useState("all");
  const [filterMinSF, setFilterMinSF] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Derive unique submarkets and landlords from data
  const submarkets = useMemo(() => {
    const set = new Set(buildings.map((b) => b.submarket).filter(Boolean));
    return Array.from(set).sort();
  }, [buildings]);

  const landlords = useMemo(() => {
    const set = new Set(buildings.flatMap((b) => b.landlord).filter(Boolean));
    return Array.from(set).sort();
  }, [buildings]);

  const hasActiveFilters =
    filterSubmarket !== "all" ||
    filterClass !== "all" ||
    filterLandlord !== "all" ||
    filterMinSF !== "" ||
    filterSearch !== "";

  function clearFilters() {
    setFilterSubmarket("all");
    setFilterClass("all");
    setFilterLandlord("all");
    setFilterMinSF("");
    setFilterSearch("");
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // Filter, then sort
  const filtered = useMemo(() => {
    return buildings.filter((b) => {
      if (filterSubmarket !== "all" && b.submarket !== filterSubmarket) return false;
      if (filterClass !== "all" && b.buildingClass !== filterClass) return false;
      if (filterLandlord !== "all" && !b.landlord.includes(filterLandlord)) return false;
      if (filterMinSF !== "") {
        const min = Number(filterMinSF);
        if (!isNaN(min) && b.squareFootage < min) return false;
      }
      if (filterSearch.trim() !== "") {
        const q = filterSearch.trim().toLowerCase();
        if (!b.address.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [buildings, filterSubmarket, filterClass, filterLandlord, filterMinSF, filterSearch]);

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

  function handleAdd(formValues: Record<string, unknown>) {
    addBuilding({
      id: genId("b"),
      address: String(formValues.address ?? ""),
      city: String(formValues.city ?? ""),
      state: String(formValues.state ?? ""),
      zipCode: String(formValues.zipCode ?? ""),
      submarket: String(formValues.submarket ?? ""),
      squareFootage: Number(formValues.squareFootage ?? 0),
      buildingClass: (formValues.buildingClass as "A" | "B" | "C") ?? "B",
      landlord: splitCsv(formValues.landlord),
      leasingBrokerage: splitCsv(formValues.leasingBrokerage),
      leasingReps: splitCsv(formValues.leasingReps),
      teamMembers: Array.isArray(formValues.teamMembers) ? formValues.teamMembers as string[] : [],
      rentPerSF: formValues.rentPerSF ? Number(formValues.rentPerSF) : null,
      taxOperating: formValues.taxOperating ? Number(formValues.taxOperating) : null,
    });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Buildings</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length === buildings.length
              ? `${buildings.length} buildings`
              : `${filtered.length} of ${buildings.length} buildings`}
          </span>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" />
            Add Building
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Submarket dropdown */}
        <Select value={filterSubmarket} onValueChange={(v) => setFilterSubmarket(v ?? "all")}>
          <SelectTrigger className="text-xs h-7 min-w-[130px]">
            <SelectValue placeholder="All Submarkets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Submarkets</SelectItem>
            {submarkets.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Class toggle buttons */}
        <div className="flex items-center rounded-lg border border-input overflow-hidden">
          {["all", "A", "B", "C"].map((cls) => (
            <button
              key={cls}
              onClick={() => setFilterClass(cls)}
              className={`px-2.5 py-1 text-xs transition-colors ${
                filterClass === cls
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {cls === "all" ? "All" : `Class ${cls}`}
            </button>
          ))}
        </div>

        {/* Landlord dropdown */}
        <Select value={filterLandlord} onValueChange={(v) => setFilterLandlord(v ?? "all")}>
          <SelectTrigger className="text-xs h-7 min-w-[140px]">
            <SelectValue placeholder="All Landlords" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Landlords</SelectItem>
            {landlords.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Min SF input */}
        <Input
          type="number"
          placeholder="Min SF"
          value={filterMinSF}
          onChange={(e) => setFilterMinSF(e.target.value)}
          className="w-24 h-7 text-xs"
        />

        {/* Search input */}
        <Input
          type="text"
          placeholder="Search address..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="w-40 h-7 text-xs"
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <X size={12} />
            Clear filters
          </Button>
        )}
      </div>

      <EditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Building"
        fields={buildingFields}
        values={{}}
        onSave={handleAdd}
      />

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Address" field="address" />
              <SortHeader label="City" field="city" />
              <SortHeader label="State" field="state" />
              <SortHeader label="Zip" field="zipCode" />
              <SortHeader label="Submarket" field="submarket" />
              <SortHeader label="Square Footage" field="squareFootage" />
              <SortHeader label="Class" field="buildingClass" />
              <TableHead>Tenants</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Occupied SF</TableHead>
              <TableHead>Landlord</TableHead>
              <TableHead>Leasing Brokerage</TableHead>
              <TableHead>Team</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="text-xs">
                  <Link
                    href={`/buildings/${b.id}`}
                    className="text-cw-green hover:underline font-medium"
                  >
                    {b.address}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {b.city}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {b.state}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {b.zipCode}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {b.submarket}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground text-right">
                  {b.squareFootage.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 ${classColor[b.buildingClass] ?? ""}`}
                  >
                    Class {b.buildingClass}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground text-right">
                  {(() => {
                    const bl = leases.filter((l) => l.buildingId === b.id);
                    return bl.length;
                  })()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground text-right">
                  {(() => {
                    const bl = leases.filter((l) => l.buildingId === b.id);
                    const companyIds = new Set(bl.map((l) => l.companyId));
                    return contacts.filter((c) => companyIds.has(c.companyId)).length;
                  })()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground text-right">
                  {(() => {
                    const bl = leases.filter((l) => l.buildingId === b.id);
                    return bl.reduce((sum, l) => sum + l.squareFootage, 0).toLocaleString();
                  })()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {b.landlord.join(", ")}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {b.leasingBrokerage.join(", ")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(b.teamMembers ?? []).map((m) => (
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
      </div>
    </div>
  );
}
