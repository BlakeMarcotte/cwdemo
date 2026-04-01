"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useData, genId } from "@/lib/data-context";
import { ArrowUpDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...buildings].sort((a, b) => {
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
  }, [buildings, sortKey, sortDir]);

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
            {buildings.length} buildings
          </span>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" />
            Add Building
          </Button>
        </div>
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
