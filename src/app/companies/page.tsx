"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, Ban, Plus } from "lucide-react";
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
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
    options: ["Prospect", "Client", "Past Client", "Vendor", "Competitor"],
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

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return companies;
    return [...companies].sort((a, b) => {
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
  }, [companies, sortKey, sortDir]);

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

      <div className="rounded-lg border border-border bg-card">
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

                {/* Website — blue external link */}
                <TableCell className="text-xs px-2 py-1.5">
                  <a
                    href={
                      c.website.startsWith("http")
                        ? c.website
                        : `https://${c.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {c.website.replace(/^https?:\/\//, "")}
                  </a>
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
      </div>
    </div>
  );
}
