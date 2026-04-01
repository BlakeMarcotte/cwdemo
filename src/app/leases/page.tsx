"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { ArrowUpDown, CheckSquare, Square, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TEAM_MEMBERS } from "@/lib/data";
import type { Lease } from "@/lib/data";

type SortKey = keyof Lease;

const leaseFields: FieldDef[] = [
  { key: "company", label: "Company", type: "text" },
  { key: "companyId", label: "Company ID", type: "text", placeholder: "Company ID" },
  { key: "address", label: "Address", type: "text" },
  { key: "buildingId", label: "Building ID", type: "text", placeholder: "Building ID" },
  { key: "suites", label: "Suite(s)", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "zipCode", label: "Zip Code", type: "text" },
  {
    key: "submarket",
    label: "Submarket",
    type: "select",
    options: ["City", "North Suburbs", "West Suburbs", "South Suburbs", "O'Hare"],
  },
  {
    key: "assetType",
    label: "Asset Type",
    type: "select",
    options: ["Office", "Industrial", "Retail", "Lab"],
  },
  { key: "squareFootage", label: "Square Footage", type: "number" },
  {
    key: "occupancy",
    label: "Occupancy",
    type: "select",
    options: ["Lease", "Own", "Sublease"],
  },
  { key: "moveInDate", label: "Move-In Date", type: "date" },
  { key: "leaseCommencement", label: "Lease Commencement", type: "date" },
  { key: "terminationDate", label: "Termination Date", type: "date" },
  { key: "leaseExpiration", label: "Lease Expiration", type: "date" },
  {
    key: "agreement",
    label: "Agreement",
    type: "select",
    options: ["New Lease", "Renewal", "2nd Amendment", "Expansion"],
  },
  { key: "tenantBrokerage", label: "Tenant Brokerage", type: "text", placeholder: "Comma-separated" },
  { key: "tenantReps", label: "Tenant Reps", type: "text", placeholder: "Comma-separated" },
  { key: "activeOpportunity", label: "Active Opportunity", type: "checkbox" },
  { key: "comp", label: "Comp", type: "checkbox" },
  { key: "subleaseList", label: "Sublease List", type: "checkbox" },
  { key: "teamMembers", label: "Team", type: "multi-select", options: TEAM_MEMBERS },
];

export default function LeasesPage() {
  const { leases, addLease } = useData();
  const [sortKey, setSortKey] = useState<SortKey>("company");
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
    return [...leases].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        cmp = aVal === bVal ? 0 : aVal ? -1 : 1;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [leases, sortKey, sortDir]);

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
          <h1 className="text-lg font-semibold">Leases</h1>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" />
            Add Lease
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {leases.length} leases
        </span>
      </div>

      <EditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Lease"
        fields={leaseFields}
        values={{
          activeOpportunity: false,
          comp: false,
          subleaseList: false,
          squareFootage: 0,
          tenantBrokerage: "",
          tenantReps: "",
          teamMembers: [],
        }}
        onSave={(values) => {
          const tenantBrokerage =
            typeof values.tenantBrokerage === "string"
              ? values.tenantBrokerage.split(",").map((s: string) => s.trim()).filter(Boolean)
              : values.tenantBrokerage;
          const tenantReps =
            typeof values.tenantReps === "string"
              ? values.tenantReps.split(",").map((s: string) => s.trim()).filter(Boolean)
              : values.tenantReps;
          addLease({
            ...values,
            tenantBrokerage,
            tenantReps,
            id: genId("l"),
          } as Lease);
        }}
      />

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Company" field="company" />
              <SortHeader label="Address" field="address" />
              <SortHeader label="Suite(s)" field="suites" />
              <SortHeader label="City" field="city" />
              <SortHeader label="Zip" field="zipCode" />
              <SortHeader label="Submarket" field="submarket" />
              <SortHeader label="Asset Type" field="assetType" />
              <SortHeader label="Square Footage" field="squareFootage" />
              <SortHeader label="Occupancy" field="occupancy" />
              <SortHeader label="Lease Commencement" field="leaseCommencement" />
              <SortHeader label="Lease Expiration" field="leaseExpiration" />
              <SortHeader label="Agreement" field="agreement" />
              <TableHead>Tenant Brokerage</TableHead>
              <SortHeader label="Active" field="activeOpportunity" />
              <SortHeader label="Comp" field="comp" />
              <TableHead>Team</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">
                  <Link
                    href={`/companies/${l.companyId}`}
                    className="text-cw-green hover:underline font-medium"
                  >
                    {l.company}
                  </Link>
                </TableCell>
                <TableCell className="text-xs">
                  <Link
                    href={`/buildings/${l.buildingId}`}
                    className="text-cw-green hover:underline"
                  >
                    {l.address}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.suites}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.city}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.zipCode}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.submarket}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.assetType}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground text-right">
                  {l.squareFootage.toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.occupancy}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.leaseCommencement}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.leaseExpiration}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.agreement}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.tenantBrokerage.join(", ")}
                </TableCell>
                <TableCell className="text-center">
                  {l.activeOpportunity ? (
                    <CheckSquare size={14} className="text-cw-green mx-auto" />
                  ) : (
                    <Square size={14} className="text-muted-foreground/40 mx-auto" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {l.comp ? (
                    <CheckSquare size={14} className="text-cw-green mx-auto" />
                  ) : (
                    <Square size={14} className="text-muted-foreground/40 mx-auto" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(l.teamMembers ?? []).map((m) => (
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
