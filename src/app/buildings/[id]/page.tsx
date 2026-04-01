"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useData } from "@/lib/data-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  MapPin,
  Ruler,
  Users,
  Phone,
  Mail,
  Pencil,
  CalendarClock,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { TEAM_MEMBERS } from "@/lib/data";

const classColor: Record<string, string> = {
  A: "bg-green-500/20 text-green-400 border-green-500/30",
  B: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  C: "bg-red-500/20 text-red-400 border-red-500/30",
};

const designationColor: Record<string, string> = {
  "Decision Maker": "bg-red-500/20 text-red-400 border-red-500/30",
  Influencer: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Coordinator: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "End User": "bg-muted text-muted-foreground border-border",
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
  { key: "rentPerSF", label: "Rent per SF ($/SF)", type: "number", placeholder: "e.g. 42.50" },
  { key: "taxOperating", label: "Tax & Operating ($/SF)", type: "number", placeholder: "e.g. 16.75" },
];

function parseExpDate(d: string): Date {
  const parts = d.split("/");
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`);
  }
  return new Date(d);
}

function getExpYear(d: string): number {
  const parts = d.split("/");
  if (parts.length === 3) return parseInt(parts[2], 10);
  return new Date(d).getFullYear();
}

const CURRENT_YEAR = 2026;

function splitCsv(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  return String(val ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { buildings, leases, contacts, updateBuilding } = useData();
  const [editOpen, setEditOpen] = useState(false);

  const building = buildings.find((b) => b.id === id);

  if (!building) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Building not found.</p>
      </div>
    );
  }

  const buildingLeases = leases.filter((l) => l.buildingId === building.id);
  const occupiedSF = buildingLeases.reduce((sum, l) => sum + l.squareFootage, 0);
  const occupancyPct = building.squareFootage > 0 ? Math.round((occupiedSF / building.squareFootage) * 100) : 0;
  const uniqueCompanies = new Set(buildingLeases.map((l) => l.companyId));
  const totalContacts = contacts.filter((c) => uniqueCompanies.has(c.companyId)).length;

  // Pre-fill values for the edit dialog, converting arrays to comma-separated strings
  const editValues: Record<string, unknown> = {
    address: building.address,
    city: building.city,
    state: building.state,
    zipCode: building.zipCode,
    submarket: building.submarket,
    squareFootage: building.squareFootage,
    buildingClass: building.buildingClass,
    landlord: building.landlord.join(", "),
    leasingBrokerage: building.leasingBrokerage.join(", "),
    leasingReps: building.leasingReps.join(", "),
    teamMembers: building.teamMembers ?? [],
    rentPerSF: building.rentPerSF ?? "",
    taxOperating: building.taxOperating ?? "",
  };

  function handleSave(formValues: Record<string, unknown>) {
    updateBuilding(building!.id, {
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Building2 size={20} />
              {building.address}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <MapPin size={13} />
              {building.city}, {building.state} {building.zipCode}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={13} className="mr-1" />
              Edit
            </Button>
            <Badge
              variant="outline"
              className={`text-xs ${classColor[building.buildingClass] ?? ""}`}
            >
              Class {building.buildingClass}
            </Badge>
          </div>
        </div>

        <EditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Edit Building"
          fields={buildingFields}
          values={editValues}
          onSave={handleSave}
        />

        {/* Building stats row */}
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Submarket</span>
            <p>{building.submarket}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">
              Total Square Footage
            </span>
            <p className="flex items-center gap-1">
              <Ruler size={13} className="text-muted-foreground" />
              {building.squareFootage.toLocaleString()} SF
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Landlord</span>
            <p>{building.landlord.join(", ")}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">
              Leasing Brokerage
            </span>
            <p>{building.leasingBrokerage.join(", ")}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Leasing Reps</span>
            <p>{building.leasingReps.join(", ")}</p>
          </div>
          {building.rentPerSF != null && (
            <div>
              <span className="text-xs text-muted-foreground">Rent / SF</span>
              <p className="font-medium text-emerald-400">${building.rentPerSF.toFixed(2)}</p>
            </div>
          )}
          {building.taxOperating != null && (
            <div>
              <span className="text-xs text-muted-foreground">Tax & Operating / SF</span>
              <p className="font-medium text-amber-400">${building.taxOperating.toFixed(2)}</p>
            </div>
          )}
          {building.rentPerSF != null && building.taxOperating != null && (
            <div>
              <span className="text-xs text-muted-foreground">Gross Rent / SF</span>
              <p className="font-medium">${(building.rentPerSF + building.taxOperating).toFixed(2)}</p>
            </div>
          )}
          {(building.teamMembers ?? []).length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Team</span>
              <div className="flex gap-1 mt-0.5">
                {building.teamMembers.map((m) => (
                  <span key={m} className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-xs text-indigo-400">
                    {m.split(" ")[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Occupancy summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Tenants</p>
            <p className="text-xl font-bold">{uniqueCompanies.size}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Contacts</p>
            <p className="text-xl font-bold">{totalContacts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Occupied SF</p>
            <p className="text-xl font-bold">{occupiedSF.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Occupancy</p>
            <p className="text-xl font-bold">{occupancyPct}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Intelligence — Pro Rata Share & Cash Flow Analysis */}
      {building.rentPerSF != null && buildingLeases.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign size={16} />
            Financial Intelligence
          </h2>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tenant</TableHead>
                  <TableHead className="text-xs">Suite(s)</TableHead>
                  <TableHead className="text-xs text-right">SF</TableHead>
                  <TableHead className="text-xs text-right">Pro Rata Share</TableHead>
                  <TableHead className="text-xs text-right">Annualized Rent</TableHead>
                  {building.taxOperating != null && (
                    <TableHead className="text-xs text-right">Gross (w/ Tax & Op)</TableHead>
                  )}
                  <TableHead className="text-xs">Expiration</TableHead>
                  <TableHead className="text-xs text-right">Cash Flow Gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildingLeases.map((lease) => {
                  const proRata = building.squareFootage > 0
                    ? (lease.squareFootage / building.squareFootage) * 100
                    : 0;
                  const annualizedRent = lease.squareFootage * (building.rentPerSF ?? 0);
                  const grossRent = building.taxOperating != null
                    ? lease.squareFootage * ((building.rentPerSF ?? 0) + building.taxOperating)
                    : null;
                  const expYear = lease.leaseExpiration ? getExpYear(lease.leaseExpiration) : null;
                  const isExpiringSoon = expYear != null && expYear <= CURRENT_YEAR + 2;

                  return (
                    <TableRow key={lease.id}>
                      <TableCell className="text-xs">
                        <Link
                          href={`/companies/${lease.companyId}`}
                          className="text-cw-green hover:underline font-medium"
                        >
                          {lease.company}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lease.suites}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {lease.squareFootage.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {proRata.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium text-emerald-400">
                        ${annualizedRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      {building.taxOperating != null && (
                        <TableCell className="text-xs text-right text-muted-foreground">
                          ${grossRent?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                      )}
                      <TableCell className="text-xs">
                        <span className={isExpiringSoon ? "text-amber-400 font-medium" : "text-muted-foreground"}>
                          {isExpiringSoon && <AlertTriangle size={10} className="inline mr-1" />}
                          {lease.leaseExpiration || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {isExpiringSoon ? (
                          <span className="font-medium text-red-400">
                            -${annualizedRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="border-t-2 border-border font-medium">
                  <TableCell className="text-xs" colSpan={2}>
                    Total
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {occupiedSF.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {(building.squareFootage > 0 ? (occupiedSF / building.squareFootage) * 100 : 0).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-xs text-right text-emerald-400">
                    ${(occupiedSF * (building.rentPerSF ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                  {building.taxOperating != null && (
                    <TableCell className="text-xs text-right text-muted-foreground">
                      ${(occupiedSF * ((building.rentPerSF ?? 0) + building.taxOperating)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                  )}
                  <TableCell className="text-xs" />
                  <TableCell className="text-xs text-right text-red-400">
                    {(() => {
                      const atRiskSF = buildingLeases
                        .filter((l) => l.leaseExpiration && getExpYear(l.leaseExpiration) <= CURRENT_YEAR + 2)
                        .reduce((sum, l) => sum + l.squareFootage, 0);
                      const atRiskRent = atRiskSF * (building.rentPerSF ?? 0);
                      return atRiskRent > 0
                        ? `-$${atRiskRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr`
                        : "—";
                    })()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Lease Expiration Summary */}
      {buildingLeases.length > 0 && <LeaseExpirationSection leases={buildingLeases} />}

      {/* Tenants section */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Users size={16} />
          Tenants ({uniqueCompanies.size} companies, {buildingLeases.length} leases)
        </h2>

        {buildingLeases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tenants in this building.
          </p>
        ) : (
          <div className="space-y-4">
            {buildingLeases.map((lease) => {
              const tenantContacts = contacts.filter(
                (c) => c.companyId === lease.companyId
              );

              return (
                <Card key={lease.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <Link
                        href={`/companies/${lease.companyId}`}
                        className="text-cw-green hover:underline font-semibold"
                      >
                        {lease.company}
                      </Link>
                      <span className="text-xs text-muted-foreground font-normal">
                        {lease.suites}
                      </span>
                    </CardTitle>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {lease.squareFootage.toLocaleString()} SF
                      </span>
                      <span>{lease.assetType}</span>
                      <span>
                        Lease: {lease.leaseCommencement} &ndash;{" "}
                        {lease.leaseExpiration}
                      </span>
                      <span>{lease.agreement}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tenantContacts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No contacts on file.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Title</TableHead>
                            <TableHead className="text-xs">Phone</TableHead>
                            <TableHead className="text-xs">Email</TableHead>
                            <TableHead className="text-xs">
                              Designation
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tenantContacts.map((ct) => (
                            <TableRow key={ct.id}>
                              <TableCell className="text-xs">
                                <Link
                                  href={`/contacts/${ct.id}`}
                                  className="text-cw-green hover:underline font-medium"
                                >
                                  {ct.name}
                                </Link>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {ct.title}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Phone size={11} />
                                  {ct.officePhone}
                                  {ct.ext ? ` x${ct.ext}` : ""}
                                </span>
                                {ct.mobilePhone && (
                                  <span className="flex items-center gap-1 mt-0.5">
                                    <Phone size={11} />
                                    {ct.mobilePhone}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                <a
                                  href={`mailto:${ct.email}`}
                                  className="text-cw-blue hover:underline inline-flex items-center gap-1"
                                >
                                  <Mail size={11} />
                                  {ct.email}
                                </a>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {ct.designation.map((d) => (
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
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lease Expiration Section
// ---------------------------------------------------------------------------

interface YearBucket {
  year: number;
  totalSF: number;
  leases: {
    id: string;
    company: string;
    companyId: string;
    suites: string;
    squareFootage: number;
    leaseExpiration: string;
    agreement: string;
  }[];
}

function LeaseExpirationSection({
  leases,
}: {
  leases: ReturnType<typeof Array<any>>;
}) {
  const { byYear, maxSF, sortedLeases } = useMemo(() => {
    const map = new Map<number, YearBucket>();

    for (const l of leases) {
      if (!l.leaseExpiration) continue;
      const year = getExpYear(l.leaseExpiration);
      if (!map.has(year)) {
        map.set(year, { year, totalSF: 0, leases: [] });
      }
      const bucket = map.get(year)!;
      bucket.totalSF += l.squareFootage;
      bucket.leases.push({
        id: l.id,
        company: l.company,
        companyId: l.companyId,
        suites: l.suites,
        squareFootage: l.squareFootage,
        leaseExpiration: l.leaseExpiration,
        agreement: l.agreement,
      });
    }

    const byYear = [...map.values()].sort((a, b) => a.year - b.year);
    const maxSF = Math.max(...byYear.map((b) => b.totalSF), 1);

    const sortedLeases = [...leases]
      .filter((l) => l.leaseExpiration)
      .sort(
        (a, b) =>
          parseExpDate(a.leaseExpiration).getTime() -
          parseExpDate(b.leaseExpiration).getTime()
      );

    return { byYear, maxSF, sortedLeases };
  }, [leases]);

  if (byYear.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <CalendarClock size={16} />
        Lease Expiration Summary
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Expiring SF by Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {byYear.map((bucket) => {
                const isNear = bucket.year <= CURRENT_YEAR + 2;
                return (
                  <div key={bucket.year} className="flex items-center gap-3">
                    <span
                      className={`w-10 shrink-0 text-xs font-medium text-right ${
                        bucket.year <= CURRENT_YEAR
                          ? "text-red-400"
                          : isNear
                            ? "text-amber-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {bucket.year}
                    </span>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-6 flex-1 overflow-hidden rounded bg-muted/50">
                        <div
                          className={`h-full rounded transition-all ${
                            bucket.year <= CURRENT_YEAR
                              ? "bg-red-500/70"
                              : isNear
                                ? "bg-amber-500/70"
                                : "bg-blue-500/50"
                          }`}
                          style={{
                            width: `${(bucket.totalSF / maxSF) * 100}%`,
                            minWidth: "1.5rem",
                          }}
                        />
                      </div>
                      <span className="w-20 text-right text-xs text-muted-foreground shrink-0">
                        {bucket.totalSF.toLocaleString()} SF
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 h-4 shrink-0"
                    >
                      {bucket.leases.length}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Expiration timeline list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Expiration Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tenant</TableHead>
                    <TableHead className="text-xs">Suite(s)</TableHead>
                    <TableHead className="text-xs text-right">SF</TableHead>
                    <TableHead className="text-xs">Expiration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeases.map((l) => {
                    const year = getExpYear(l.leaseExpiration);
                    const isPast = year <= CURRENT_YEAR;
                    const isNear = year <= CURRENT_YEAR + 2;
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">
                          <Link
                            href={`/companies/${l.companyId}`}
                            className="text-cw-green hover:underline font-medium"
                          >
                            {l.company}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {l.suites}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-right">
                          {l.squareFootage.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              isPast
                                ? "text-red-400 font-medium"
                                : isNear
                                  ? "text-amber-400 font-medium"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {(isPast || isNear) && (
                              <AlertTriangle size={10} />
                            )}
                            {l.leaseExpiration}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
