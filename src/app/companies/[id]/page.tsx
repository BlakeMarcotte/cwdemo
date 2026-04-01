"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Phone,
  Globe,
  MapPin,
  ExternalLink,
  Ban,
  Clock,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  FolderOpen,
  MapPinned,
  StickyNote,
  Pencil,
  ListTodo,
  Check,
} from "lucide-react";
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { TEAM_MEMBERS } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

const relationshipColor: Record<string, string> = {
  Prospect: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Client: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Past Client": "bg-muted text-muted-foreground border-border",
  Vendor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Competitor: "bg-red-500/15 text-red-400 border-red-500/30",
  "Active Pursuit": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Passive Pursuit": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

const stageColor: Record<string, string> = {
  Lead: "bg-muted text-muted-foreground border-border",
  Qualified: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Proposal: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Negotiation: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Closed Won": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Closed Lost": "bg-red-500/15 text-red-400 border-red-500/30",
};

const activityTypeIcon: Record<string, string> = {
  Call: "text-blue-400",
  Meeting: "text-emerald-400",
  Update: "text-yellow-400",
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

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const { companies, contacts, leases, activities, opportunities, updateCompany, todoItems, addTodoItem } = useData();
  const [editOpen, setEditOpen] = useState(false);
  const [todoAdded, setTodoAdded] = useState(false);

  const company = companies.find((c) => c.id === params.id);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Company not found.</p>
      </div>
    );
  }

  const companyContacts = contacts.filter((c) => c.companyId === company.id);
  const companyLeases = leases.filter((l) => l.companyId === company.id);
  const companyActivities = activities
    .filter((a) => a.companyId === company.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const companyOpportunities = opportunities.filter(
    (o) => o.companyId === company.id
  );

  const websiteUrl = company.website.startsWith("http")
    ? company.website
    : `https://${company.website}`;

  // Prepare values for the edit dialog — flatten arrays to comma-separated strings
  const editValues: Record<string, unknown> = {
    ...company,
    msaBrokerage: company.msaBrokerage.join(", "),
    spocContact: company.spocContact.join(", "),
    msaExpiration: company.msaExpiration ?? "",
  };

  function handleEditSave(formValues: Record<string, unknown>) {
    const msaBrokerage = formValues.msaBrokerage
      ? String(formValues.msaBrokerage).split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const spocContact = formValues.spocContact
      ? String(formValues.spocContact).split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    updateCompany(company!.id, {
      ...formValues,
      msaBrokerage,
      spocContact,
      msaExpiration: formValues.msaExpiration ? String(formValues.msaExpiration) : null,
    } as Parameters<typeof updateCompany>[1]);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">
                {company.name}
              </h1>
              {company.doNotContact && (
                <Badge
                  variant="outline"
                  className="bg-red-500/15 text-red-400 border-red-500/30"
                >
                  <Ban size={10} className="mr-1" />
                  Do Not Contact
                </Badge>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
              >
                {company.industry}
              </Badge>
              {company.relationship.map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className={relationshipColor[r] ?? ""}
                >
                  {r}
                </Badge>
              ))}
              {(company.teamMembers ?? []).map((m) => (
                <Badge
                  key={m}
                  variant="outline"
                  className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                >
                  {m.split(" ")[0]}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const maxPos = todoItems.length > 0
                  ? Math.max(...todoItems.map((t) => t.position))
                  : 0;
                addTodoItem({
                  id: genId("td"),
                  title: `Follow up on ${company!.name}`,
                  completed: false,
                  position: maxPos + 1,
                  entityType: "company",
                  entityId: company!.id,
                  entityName: company!.name,
                  createdAt: new Date().toISOString().slice(0, 10),
                });
                setTodoAdded(true);
                setTimeout(() => setTodoAdded(false), 2000);
              }}
            >
              {todoAdded ? (
                <Check size={14} className="mr-1.5 text-emerald-400" />
              ) : (
                <ListTodo size={14} className="mr-1.5" />
              )}
              {todoAdded ? "Added!" : "Add to To-Do"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil size={14} className="mr-1.5" />
              Edit
            </Button>
          </div>
        </div>

        <EditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Edit Company"
          fields={companyFields}
          values={editValues}
          onSave={handleEditSave}
        />

        {/* Detail row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} />
            {company.hqAddress}, {company.city}, {company.state}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone size={14} />
            {company.mainPhone}
          </span>
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:underline"
          >
            <Globe size={14} />
            {company.website.replace(/^https?:\/\//, "")}
          </a>
          <a
            href={company.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:underline"
          >
            <ExternalLink size={14} />
            LinkedIn
          </a>
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={14} />
            {company.locations} location{company.locations !== 1 ? "s" : ""}
          </span>
        </div>

        {/* MSA row */}
        {(company.msaBrokerage.length > 0 || company.spocContact.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {company.msaBrokerage.length > 0 && (
              <span>
                <span className="font-medium text-foreground/70">MSA:</span>{" "}
                {company.msaBrokerage.join(", ")}
                {company.msaExpiration && (
                  <span className="text-muted-foreground">
                    {" "}(exp. {company.msaExpiration})
                  </span>
                )}
              </span>
            )}
            {company.spocContact.length > 0 && (
              <span>
                <span className="font-medium text-foreground/70">SPOC:</span>{" "}
                {company.spocContact.join(", ")}
              </span>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs defaultValue="notes">
        <TabsList variant="line">
          <TabsTrigger value="notes">
            <StickyNote size={14} className="mr-1.5" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock size={14} className="mr-1.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <Users size={14} className="mr-1.5" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="leases">
            <FileText size={14} className="mr-1.5" />
            Leases
          </TabsTrigger>
          <TabsTrigger value="activities">
            <Calendar size={14} className="mr-1.5" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="opportunities">
            <TrendingUp size={14} className="mr-1.5" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FolderOpen size={14} className="mr-1.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="addresses">
            <MapPinned size={14} className="mr-1.5" />
            Addresses
          </TabsTrigger>
        </TabsList>

        {/* ── Notes ──────────────────────────────────────────────────── */}
        <TabsContent value="notes" className="pt-4">
          <Card size="sm">
            <CardContent>
              <textarea
                className="w-full min-h-[200px] resize-y rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Add notes about this company..."
                defaultValue=""
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History ────────────────────────────────────────────────── */}
        <TabsContent value="history" className="pt-4">
          {companyActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No activity history for this company.
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <ScrollableTable>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs px-2 py-1.5 w-28">Date / Time</TableHead>
                    <TableHead className="text-xs px-2 py-1.5 w-24">Result</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Title &amp; Details</TableHead>
                    <TableHead className="text-xs px-2 py-1.5 w-36">Team Member</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyActivities.map((act) => (
                    <TableRow key={act.id}>
                      <TableCell className="text-xs px-2 py-2 align-top">
                        <div className="font-medium text-foreground">{act.date}</div>
                        <div className="text-muted-foreground">{act.time}</div>
                      </TableCell>
                      <TableCell className="text-xs px-2 py-2 align-top">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            act.type === "Call"
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                              : act.type === "Meeting"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                          }`}
                        >
                          {act.type}
                        </Badge>
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              act.priority === "High"
                                ? "bg-red-500/15 text-red-400 border-red-500/30"
                                : act.priority === "Medium"
                                  ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                                  : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {act.priority}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs px-2 py-2 align-top">
                        <div className="font-medium text-foreground">{act.contact}</div>
                        <p className="text-muted-foreground mt-0.5 whitespace-normal leading-relaxed">
                          {act.regarding}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs px-2 py-2 align-top text-muted-foreground">
                        {(act.teamMembers ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {act.teamMembers.map((m) => (
                              <span
                                key={m}
                                className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0 text-[10px] text-indigo-400"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          act.contact
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </ScrollableTable>
            </div>
          )}
        </TabsContent>

        {/* ── Contacts ──────────────────────────────────────────────── */}
        <TabsContent value="contacts" className="pt-4">
          {companyContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No contacts linked to this company.
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <ScrollableTable>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs px-2 py-1.5">Name</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Title</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Email</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Office Phone</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Mobile</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Designation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyContacts.map((ct) => (
                    <TableRow key={ct.id}>
                      <TableCell className="text-xs px-2 py-1.5 font-medium">
                        <Link
                          href={`/contacts/${ct.id}`}
                          className="text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          {ct.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {ct.title}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5">
                        <a
                          href={`mailto:${ct.email}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {ct.email}
                        </a>
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {ct.officePhone}
                        {ct.ext ? ` x${ct.ext}` : ""}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {ct.mobilePhone}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5">
                        <div className="flex flex-wrap gap-1">
                          {ct.designation.map((d) => (
                            <Badge
                              key={d}
                              variant="outline"
                              className="text-[10px] bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
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
              </ScrollableTable>
            </div>
          )}
        </TabsContent>

        {/* ── Leases ────────────────────────────────────────────────── */}
        <TabsContent value="leases" className="pt-4">
          {companyLeases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No leases linked to this company.
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <ScrollableTable>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs px-2 py-1.5">Address</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Suites</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Submarket</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Asset Type</TableHead>
                    <TableHead className="text-xs px-2 py-1.5 text-right">SF</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Occupancy</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Commencement</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Expiration</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Agreement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyLeases.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs px-2 py-1.5 font-medium">
                        <Link
                          href={`/leases/${l.id}`}
                          className="text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          {l.address}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {l.suites}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {l.submarket}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {l.assetType}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground text-right">
                        {formatNumber(l.squareFootage)}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {l.occupancy}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {l.leaseCommencement}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {l.leaseExpiration}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {l.agreement}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </ScrollableTable>
            </div>
          )}
        </TabsContent>

        {/* ── Activities ────────────────────────────────────────────── */}
        <TabsContent value="activities" className="pt-4">
          {companyActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No activities recorded for this company.
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <ScrollableTable>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs px-2 py-1.5">Type</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Date</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Time</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Priority</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Contact</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Regarding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyActivities.map((act) => (
                    <TableRow key={act.id}>
                      <TableCell className="text-xs px-2 py-1.5">
                        <Badge
                          variant="outline"
                          className={
                            act.type === "Call"
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                              : act.type === "Meeting"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                          }
                        >
                          {act.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {act.date}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {act.time}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5">
                        <Badge
                          variant="outline"
                          className={
                            act.priority === "High"
                              ? "bg-red-500/15 text-red-400 border-red-500/30"
                              : act.priority === "Medium"
                                ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                                : "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {act.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground">
                        {act.contact}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 text-muted-foreground max-w-xs truncate">
                        {act.regarding}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </ScrollableTable>
            </div>
          )}
        </TabsContent>

        {/* ── Opportunities ─────────────────────────────────────────── */}
        <TabsContent value="opportunities" className="pt-4">
          {companyOpportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No opportunities for this company.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {companyOpportunities.map((opp) => (
                <Card key={opp.id} size="sm">
                  <CardHeader className="pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{opp.company} — {opp.contact}</CardTitle>
                      <Badge
                        variant="outline"
                        className={stageColor[opp.stage] ?? ""}
                      >
                        {opp.stage}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Commission</span>
                        <p className="font-medium text-foreground">
                          {formatCurrency(opp.estimatedCommission)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SF</span>
                        <p className="font-medium text-foreground">
                          {formatNumber(opp.squareFootage)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target Move</span>
                        <p className="font-medium text-foreground">
                          {opp.targetMoveDate}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contact</span>
                        <p className="font-medium text-foreground">{opp.contact}</p>
                      </div>
                    </div>
                    {opp.notes && (
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                        {opp.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Documents ─────────────────────────────────────────────── */}
        <TabsContent value="documents" className="pt-4">
          <Card size="sm">
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FolderOpen size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No documents uploaded</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Addresses ─────────────────────────────────────────────── */}
        <TabsContent value="addresses" className="pt-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Headquarters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin size={14} className="mt-0.5 shrink-0 text-foreground/50" />
                <div>
                  <p className="text-foreground">{company.hqAddress}</p>
                  <p>
                    {company.city}, {company.state}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
