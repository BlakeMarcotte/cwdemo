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
  ArrowUpDown,
  Send,
  CheckSquare,
  Square,
} from "lucide-react";
import { ScrollableTable } from "@/components/ui/scrollable-table";
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

      {/* Tenants — sortable/filterable table (was Financial Intelligence) */}
      {buildingLeases.length > 0 && (
        <TenantsSection
          building={building}
          leases={buildingLeases}
          occupiedSF={occupiedSF}
        />
      )}

      {/* Lease Expiration Summary */}
      {buildingLeases.length > 0 && <LeaseExpirationSection leases={buildingLeases} />}

      {/* Contacts — flat table with checkboxes + email all */}
      <ContactsSection
        leases={buildingLeases}
        contacts={contacts}
        buildingAddress={building.address}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tenants Section (sortable/filterable table)
// ---------------------------------------------------------------------------

type TenantSortKey = "company" | "suites" | "squareFootage" | "proRata" | "annualizedRent" | "grossRent" | "leaseExpiration" | "agreement";

function TenantsSection({
  building,
  leases,
  occupiedSF,
}: {
  building: { squareFootage: number; rentPerSF: number | null; taxOperating: number | null };
  leases: any[];
  occupiedSF: number;
}) {
  const [sortKey, setSortKey] = useState<TenantSortKey>("company");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterCompany, setFilterCompany] = useState("");

  function toggleSort(key: TenantSortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const enriched = useMemo(() => {
    return leases.map((l) => {
      const proRata = building.squareFootage > 0 ? (l.squareFootage / building.squareFootage) * 100 : 0;
      const annualizedRent = l.squareFootage * (building.rentPerSF ?? 0);
      const grossRent = building.taxOperating != null ? l.squareFootage * ((building.rentPerSF ?? 0) + building.taxOperating) : null;
      const expYear = l.leaseExpiration ? getExpYear(l.leaseExpiration) : null;
      const isExpiringSoon = expYear != null && expYear <= CURRENT_YEAR + 2;
      return { ...l, proRata, annualizedRent, grossRent, expYear, isExpiringSoon };
    });
  }, [leases, building]);

  const sorted = useMemo(() => {
    let list = [...enriched];
    if (filterCompany) list = list.filter((l) => l.company.toLowerCase().includes(filterCompany.toLowerCase()));
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "company": cmp = a.company.localeCompare(b.company); break;
        case "suites": cmp = a.suites.localeCompare(b.suites); break;
        case "squareFootage": cmp = a.squareFootage - b.squareFootage; break;
        case "proRata": cmp = a.proRata - b.proRata; break;
        case "annualizedRent": cmp = a.annualizedRent - b.annualizedRent; break;
        case "grossRent": cmp = (a.grossRent ?? 0) - (b.grossRent ?? 0); break;
        case "leaseExpiration": cmp = parseExpDate(a.leaseExpiration || "").getTime() - parseExpDate(b.leaseExpiration || "").getTime(); break;
        case "agreement": cmp = a.agreement.localeCompare(b.agreement); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [enriched, sortKey, sortDir, filterCompany]);

  function SortHead({ label, field, align }: { label: string; field: TenantSortKey; align?: string }) {
    return (
      <TableHead className={`text-xs ${align ?? ""}`}>
        <button
          onClick={() => toggleSort(field)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {label}
          <ArrowUpDown size={10} className={sortKey === field ? "text-cw-green" : "text-muted-foreground/40"} />
        </button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <DollarSign size={16} />
          Tenants
        </h2>
        <input
          type="text"
          placeholder="Filter by tenant..."
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="h-7 w-48 rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollableTable>
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Tenant" field="company" />
              <SortHead label="Suite(s)" field="suites" />
              <SortHead label="SF" field="squareFootage" align="text-right" />
              <SortHead label="Pro Rata" field="proRata" align="text-right" />
              {building.rentPerSF != null && <SortHead label="Annual Rent" field="annualizedRent" align="text-right" />}
              {building.taxOperating != null && <SortHead label="Gross (w/ Tax & Op)" field="grossRent" align="text-right" />}
              <SortHead label="Expiration" field="leaseExpiration" />
              <SortHead label="Agreement" field="agreement" />
              {building.rentPerSF != null && <TableHead className="text-xs text-right">Cash Flow Gap</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">
                  <Link href={`/companies/${l.companyId}`} className="text-cw-green hover:underline font-medium">{l.company}</Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.suites}</TableCell>
                <TableCell className="text-xs text-muted-foreground text-right">{l.squareFootage.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right font-medium">{l.proRata.toFixed(1)}%</TableCell>
                {building.rentPerSF != null && (
                  <TableCell className="text-xs text-right font-medium text-emerald-400">
                    ${l.annualizedRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                )}
                {building.taxOperating != null && (
                  <TableCell className="text-xs text-right text-muted-foreground">
                    ${l.grossRent?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                )}
                <TableCell className="text-xs">
                  <span className={l.isExpiringSoon ? "text-amber-400 font-medium" : "text-muted-foreground"}>
                    {l.isExpiringSoon && <AlertTriangle size={10} className="inline mr-1" />}
                    {l.leaseExpiration || "\u2014"}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.agreement}</TableCell>
                {building.rentPerSF != null && (
                  <TableCell className="text-xs text-right">
                    {l.isExpiringSoon ? (
                      <span className="font-medium text-red-400">-${l.annualizedRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</span>
                    ) : (
                      <span className="text-muted-foreground">{"\u2014"}</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow className="border-t-2 border-border font-medium">
              <TableCell className="text-xs" colSpan={2}>Total</TableCell>
              <TableCell className="text-xs text-right">{occupiedSF.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right">
                {(building.squareFootage > 0 ? (occupiedSF / building.squareFootage) * 100 : 0).toFixed(1)}%
              </TableCell>
              {building.rentPerSF != null && (
                <TableCell className="text-xs text-right text-emerald-400">
                  ${(occupiedSF * (building.rentPerSF ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </TableCell>
              )}
              {building.taxOperating != null && (
                <TableCell className="text-xs text-right text-muted-foreground">
                  ${(occupiedSF * ((building.rentPerSF ?? 0) + building.taxOperating)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </TableCell>
              )}
              <TableCell className="text-xs" />
              <TableCell className="text-xs" />
              {building.rentPerSF != null && (
                <TableCell className="text-xs text-right text-red-400">
                  {(() => {
                    const atRiskSF = sorted.filter((l) => l.isExpiringSoon).reduce((sum, l) => sum + l.squareFootage, 0);
                    const atRiskRent = atRiskSF * (building.rentPerSF ?? 0);
                    return atRiskRent > 0 ? `-$${atRiskRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr` : "\u2014";
                  })()}
                </TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>
        </ScrollableTable>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contacts Section (checkboxes + email all)
// ---------------------------------------------------------------------------

function ContactsSection({
  leases,
  contacts,
  buildingAddress,
}: {
  leases: any[];
  contacts: any[];
  buildingAddress: string;
}) {
  const companyIds = useMemo(() => new Set(leases.map((l) => l.companyId)), [leases]);
  const allContacts = useMemo(() => {
    return contacts
      .filter((c) => companyIds.has(c.companyId))
      .map((c) => {
        const lease = leases.find((l) => l.companyId === c.companyId);
        return { ...c, leaseCompany: lease?.company ?? c.company };
      });
  }, [contacts, companyIds, leases]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = allContacts.length > 0 && selected.size === allContacts.length;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allContacts.map((c) => c.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleEmailAll() {
    const selectedContacts = allContacts.filter((c) => selected.has(c.id));
    if (selectedContacts.length === 0) return;

    const to = selectedContacts.map((c) => c.email).filter(Boolean).join(",");
    const names = selectedContacts.map((c) => c.name.split(" ")[0]);
    const uniqueNames = [...new Set(names)];

    let greeting: string;
    if (uniqueNames.length === 1) {
      greeting = `Hi ${uniqueNames[0]},`;
    } else if (uniqueNames.length <= 3) {
      greeting = `Hi ${uniqueNames.slice(0, -1).join(", ")} and ${uniqueNames[uniqueNames.length - 1]},`;
    } else {
      greeting = "Hi All,";
    }

    const companies = [...new Set(selectedContacts.map((c) => c.leaseCompany))].join(", ");
    const subject = encodeURIComponent(`${buildingAddress} — Update`);
    const body = encodeURIComponent(
      `${greeting}\n\nI wanted to reach out regarding your space at ${buildingAddress}.\n\n[Your message here]\n\nBest regards`
    );

    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_self");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Users size={16} />
          Contacts ({allContacts.length})
        </h2>
        {selected.size > 0 && (
          <Button size="sm" className="gap-1.5" onClick={handleEmailAll}>
            <Send size={13} />
            Email {selected.size === allContacts.length ? "All" : selected.size} Contact{selected.size !== 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {allContacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts on file for this building.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollableTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <button onClick={toggleAll} className="p-0.5">
                    {allSelected ? (
                      <CheckSquare size={14} className="text-cw-green" />
                    ) : (
                      <Square size={14} className="text-muted-foreground/40" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Designation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allContacts.map((ct) => {
                const isSelected = selected.has(ct.id);
                return (
                  <TableRow
                    key={ct.id}
                    className={isSelected ? "bg-indigo-500/5" : ""}
                  >
                    <TableCell>
                      <button onClick={() => toggle(ct.id)} className="p-0.5">
                        {isSelected ? (
                          <CheckSquare size={14} className="text-cw-green" />
                        ) : (
                          <Square size={14} className="text-muted-foreground/40" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Link href={`/contacts/${ct.id}`} className="text-cw-green hover:underline font-medium">
                        {ct.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Link href={`/companies/${ct.companyId}`} className="text-cw-green hover:underline">
                        {ct.leaseCompany}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ct.title}</TableCell>
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
                      <a href={`mailto:${ct.email}`} className="text-cw-blue hover:underline inline-flex items-center gap-1">
                        <Mail size={11} />
                        {ct.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {ct.designation.map((d: string) => (
                          <Badge key={d} variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${designationColor[d] ?? ""}`}>
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </ScrollableTable>
        </div>
      )}
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
              <ScrollableTable>
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
              </ScrollableTable>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
