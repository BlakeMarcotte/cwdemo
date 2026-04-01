"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useData } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { TEAM_MEMBERS } from "@/lib/data";
import type { Activity, Designation } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Building2,
  Pencil,
} from "lucide-react";
import { useState } from "react";

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

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { contacts, companies, activities, updateContact } = useData();
  const contact = contacts.find((c) => c.id === id);
  const [notes, setNotes] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  if (!contact) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Contact not found.</p>
      </div>
    );
  }

  const company = companies.find((co) => co.id === contact.companyId);
  const contactActivities = activities.filter((a) => a.contactId === contact.id);
  const companyActivities = activities.filter(
    (a) => a.companyId === contact.companyId
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-semibold">{contact.name}</h1>
              <p className="text-sm text-muted-foreground">{contact.title}</p>
              <p className="text-sm mt-1">
                <Link
                  href={`/companies/${contact.companyId}`}
                  className="text-cw-green hover:underline"
                >
                  {contact.company}
                </Link>
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil size={14} className="mr-1" />
              Edit
            </Button>
          </div>
          <div className="flex gap-1">
            {contact.designation.map((d) => (
              <Badge
                key={d}
                variant="outline"
                className={`text-xs ${designationColor[d] ?? ""}`}
              >
                {d}
              </Badge>
            ))}
            {(contact.teamMembers ?? []).map((m) => (
              <Badge
                key={m}
                variant="outline"
                className="text-xs bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
              >
                {m.split(" ")[0]}
              </Badge>
            ))}
          </div>
        </div>

        <EditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Edit Contact"
          fields={contactFields}
          values={{
            name: contact.name,
            company: contact.company,
            companyId: contact.companyId,
            title: contact.title,
            contactAddress: contact.contactAddress,
            officePhone: contact.officePhone,
            ext: contact.ext ?? 0,
            mobilePhone: contact.mobilePhone,
            email: contact.email,
            location: contact.location,
            linkedIn: contact.linkedIn,
            designation: [...contact.designation],
            teamMembers: [...(contact.teamMembers ?? [])],
          }}
          onSave={(values) => {
            const { designation, ...rest } = values;
            updateContact(contact.id, {
              ...rest,
              designation: designation as Designation[],
            });
          }}
        />

        {/* Contact info row */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mt-3">
          <span className="inline-flex items-center gap-1.5">
            <Phone size={13} />
            {contact.officePhone}
            {contact.ext ? ` x${contact.ext}` : ""}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone size={13} />
            {contact.mobilePhone}
          </span>
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1.5 text-cw-blue hover:underline"
          >
            <Mail size={13} />
            {contact.email}
          </a>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} />
            {contact.location}
          </span>
          <a
            href={contact.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-cw-blue hover:underline"
          >
            <ExternalLink size={13} />
            LinkedIn
          </a>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notes">
        <TabsList variant="line">
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="contact-activity">Contact Activity</TabsTrigger>
          <TabsTrigger value="company-activity">Company Activity</TabsTrigger>
        </TabsList>

        {/* Notes */}
        <TabsContent value="notes">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                Private notes about this contact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this contact..."
                className="w-full min-h-[200px] rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company */}
        <TabsContent value="company">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Building2 size={16} />
                <Link
                  href={`/companies/${contact.companyId}`}
                  className="text-cw-green hover:underline"
                >
                  {contact.company}
                </Link>
              </CardTitle>
            </CardHeader>
            {company && (
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Industry</dt>
                    <dd>{company.industry}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Locations</dt>
                    <dd>{company.locations.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Website</dt>
                    <dd>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cw-blue hover:underline"
                      >
                        {company.website}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Address</dt>
                    <dd>
                      {company.hqAddress}, {company.city}, {company.state}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* History (same as Contact Activity for this contact) */}
        <TabsContent value="history">
          <ActivityTable
            rows={contactActivities}
            emptyMessage="No activity history for this contact."
          />
        </TabsContent>

        {/* Contact Activity */}
        <TabsContent value="contact-activity">
          <ActivityTable
            rows={contactActivities}
            emptyMessage="No activities for this contact."
          />
        </TabsContent>

        {/* Company Activity */}
        <TabsContent value="company-activity">
          <ActivityTable
            rows={companyActivities}
            emptyMessage="No activities for this company."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActivityTable({
  rows,
  emptyMessage,
}: {
  rows: Activity[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Regarding</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {a.date}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-[10px]">
                  {a.type}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{a.contact}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                {a.regarding}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
