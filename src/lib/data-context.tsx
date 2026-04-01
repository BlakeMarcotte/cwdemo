"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  Company,
  Contact,
  Lease,
  Building,
  Opportunity,
  Activity,
  ProspectEntry,
  Task,
} from "./data";
import {
  companies as seedCompanies,
  contacts as seedContacts,
  leases as seedLeases,
  buildings as seedBuildings,
  opportunities as seedOpportunities,
  activities as seedActivities,
  prospectEntries as seedProspects,
  tasks as seedTasks,
} from "./data";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = Date.now();
export function genId(prefix: string) {
  return `${prefix}_${++idCounter}`;
}

// --- Row mappers: DB snake_case → App camelCase ---

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCompany(r: any): Company {
  return {
    id: r.id,
    name: r.name,
    mainPhone: r.main_phone ?? "",
    website: r.website ?? "",
    hqAddress: r.hq_address ?? "",
    city: r.city ?? "",
    state: r.state ?? "",
    relationship: r.relationship ?? [],
    linkedIn: r.linkedin ?? "",
    industry: r.industry ?? "",
    locations: r.locations ?? 1,
    msaBrokerage: r.msa_brokerage ?? [],
    msaExpiration: r.msa_expiration ?? null,
    spocContact: r.spoc_contact ?? [],
    doNotContact: r.do_not_contact ?? false,
    teamMembers: r.team_members ?? [],
  };
}

function mapContact(r: any): Contact {
  return {
    id: r.id,
    companyId: r.company_id ?? "",
    company: r.company ?? "",
    name: r.name,
    title: r.title ?? "",
    contactAddress: r.contact_address ?? "",
    officePhone: r.office_phone ?? "",
    ext: r.ext ?? null,
    mobilePhone: r.mobile_phone ?? "",
    email: r.email ?? "",
    location: r.location ?? "",
    linkedIn: r.linkedin ?? "",
    designation: r.designation ?? [],
    teamMembers: r.team_members ?? [],
  };
}

function mapBuilding(r: any): Building {
  return {
    id: r.id,
    address: r.address,
    city: r.city ?? "",
    state: r.state ?? "",
    zipCode: r.zip_code ?? "",
    submarket: r.submarket ?? "",
    squareFootage: r.square_footage ?? 0,
    buildingClass: r.building_class ?? "A",
    landlord: r.landlord ?? [],
    leasingBrokerage: r.leasing_brokerage ?? [],
    leasingReps: r.leasing_reps ?? [],
    teamMembers: r.team_members ?? [],
    rentPerSF: r.rent_per_sf != null ? Number(r.rent_per_sf) : null,
    taxOperating: r.tax_operating != null ? Number(r.tax_operating) : null,
  };
}

function mapLease(r: any): Lease {
  return {
    id: r.id,
    companyId: r.company_id ?? "",
    company: r.company ?? "",
    buildingId: r.building_id ?? "",
    address: r.address ?? "",
    suites: r.suites ?? "",
    city: r.city ?? "",
    zipCode: r.zip_code ?? "",
    submarket: r.submarket ?? "",
    assetType: r.asset_type ?? "Office",
    squareFootage: r.square_footage ?? 0,
    occupancy: r.occupancy ?? "Lease",
    moveInDate: r.move_in_date ?? "",
    leaseCommencement: r.lease_commencement ?? "",
    terminationDate: r.termination_date ?? "",
    leaseExpiration: r.lease_expiration ?? "",
    agreement: r.agreement ?? "",
    tenantBrokerage: r.tenant_brokerage ?? [],
    tenantReps: r.tenant_reps ?? [],
    activeOpportunity: r.active_opportunity ?? false,
    comp: r.comp ?? false,
    subleaseList: r.sublease_list ?? false,
    teamMembers: r.team_members ?? [],
  };
}

function mapOpportunity(r: any): Opportunity {
  return {
    id: r.id,
    companyId: r.company_id ?? "",
    company: r.company ?? "",
    contactId: r.contact_id ?? "",
    contact: r.contact ?? "",
    stage: r.stage ?? "Lead",
    squareFootage: r.square_footage ?? 0,
    targetMoveDate: r.target_move_date ?? "",
    estimatedCommission: Number(r.estimated_commission ?? 0),
    notes: r.notes ?? "",
    teamMembers: r.team_members ?? [],
  };
}

function mapActivity(r: any): Activity {
  return {
    id: r.id,
    type: r.type,
    date: r.date ?? "",
    time: r.time ?? "",
    priority: r.priority ?? "Medium",
    contactId: r.contact_id ?? "",
    contact: r.contact ?? "",
    companyId: r.company_id ?? "",
    company: r.company ?? "",
    officePhone: r.office_phone ?? "",
    ext: r.ext ?? null,
    mobilePhone: r.mobile_phone ?? "",
    email: r.email ?? "",
    regarding: r.regarding ?? "",
    addDate: r.add_date ?? "",
    teamMembers: r.team_members ?? [],
  };
}

function mapProspect(r: any): ProspectEntry {
  return {
    id: r.id,
    companyId: r.company_id ?? "",
    company: r.company ?? "",
    industry: r.industry ?? "",
    nugget: r.nugget ?? "",
    lastContactDate: r.last_contact_date ?? "",
    nextFollowUpDate: r.next_follow_up_date ?? "",
    status: r.status ?? "Active",
    teamLead: r.team_lead ?? "",
    list: r.list ?? "focus",
    teamMembers: r.team_members ?? [],
  };
}

// --- App camelCase → DB snake_case for writes ---

function toCompanyRow(c: Partial<Company>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (c.id !== undefined) m.id = c.id;
  if (c.name !== undefined) m.name = c.name;
  if (c.mainPhone !== undefined) m.main_phone = c.mainPhone;
  if (c.website !== undefined) m.website = c.website;
  if (c.hqAddress !== undefined) m.hq_address = c.hqAddress;
  if (c.city !== undefined) m.city = c.city;
  if (c.state !== undefined) m.state = c.state;
  if (c.relationship !== undefined) m.relationship = c.relationship;
  if (c.linkedIn !== undefined) m.linkedin = c.linkedIn;
  if (c.industry !== undefined) m.industry = c.industry;
  if (c.locations !== undefined) m.locations = c.locations;
  if (c.msaBrokerage !== undefined) m.msa_brokerage = c.msaBrokerage;
  if (c.msaExpiration !== undefined) m.msa_expiration = c.msaExpiration;
  if (c.spocContact !== undefined) m.spoc_contact = c.spocContact;
  if (c.doNotContact !== undefined) m.do_not_contact = c.doNotContact;
  if ((c as any).teamMembers !== undefined) m.team_members = (c as any).teamMembers;
  return m;
}

function toContactRow(c: Partial<Contact>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (c.id !== undefined) m.id = c.id;
  if (c.companyId !== undefined) m.company_id = c.companyId;
  if (c.company !== undefined) m.company = c.company;
  if (c.name !== undefined) m.name = c.name;
  if (c.title !== undefined) m.title = c.title;
  if (c.contactAddress !== undefined) m.contact_address = c.contactAddress;
  if (c.officePhone !== undefined) m.office_phone = c.officePhone;
  if (c.ext !== undefined) m.ext = c.ext;
  if (c.mobilePhone !== undefined) m.mobile_phone = c.mobilePhone;
  if (c.email !== undefined) m.email = c.email;
  if (c.location !== undefined) m.location = c.location;
  if (c.linkedIn !== undefined) m.linkedin = c.linkedIn;
  if (c.designation !== undefined) m.designation = c.designation;
  if ((c as any).teamMembers !== undefined) m.team_members = (c as any).teamMembers;
  return m;
}

function toBuildingRow(b: Partial<Building>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (b.id !== undefined) m.id = b.id;
  if (b.address !== undefined) m.address = b.address;
  if (b.city !== undefined) m.city = b.city;
  if (b.state !== undefined) m.state = b.state;
  if (b.zipCode !== undefined) m.zip_code = b.zipCode;
  if (b.submarket !== undefined) m.submarket = b.submarket;
  if (b.squareFootage !== undefined) m.square_footage = b.squareFootage;
  if (b.buildingClass !== undefined) m.building_class = b.buildingClass;
  if (b.landlord !== undefined) m.landlord = b.landlord;
  if (b.leasingBrokerage !== undefined) m.leasing_brokerage = b.leasingBrokerage;
  if (b.leasingReps !== undefined) m.leasing_reps = b.leasingReps;
  if ((b as any).teamMembers !== undefined) m.team_members = (b as any).teamMembers;
  if (b.rentPerSF !== undefined) m.rent_per_sf = b.rentPerSF;
  if (b.taxOperating !== undefined) m.tax_operating = b.taxOperating;
  return m;
}

function toLeaseRow(l: Partial<Lease>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (l.id !== undefined) m.id = l.id;
  if (l.companyId !== undefined) m.company_id = l.companyId;
  if (l.company !== undefined) m.company = l.company;
  if (l.buildingId !== undefined) m.building_id = l.buildingId;
  if (l.address !== undefined) m.address = l.address;
  if (l.suites !== undefined) m.suites = l.suites;
  if (l.city !== undefined) m.city = l.city;
  if (l.zipCode !== undefined) m.zip_code = l.zipCode;
  if (l.submarket !== undefined) m.submarket = l.submarket;
  if (l.assetType !== undefined) m.asset_type = l.assetType;
  if (l.squareFootage !== undefined) m.square_footage = l.squareFootage;
  if (l.occupancy !== undefined) m.occupancy = l.occupancy;
  if (l.moveInDate !== undefined) m.move_in_date = l.moveInDate;
  if (l.leaseCommencement !== undefined) m.lease_commencement = l.leaseCommencement;
  if (l.terminationDate !== undefined) m.termination_date = l.terminationDate;
  if (l.leaseExpiration !== undefined) m.lease_expiration = l.leaseExpiration;
  if (l.agreement !== undefined) m.agreement = l.agreement;
  if (l.tenantBrokerage !== undefined) m.tenant_brokerage = l.tenantBrokerage;
  if (l.tenantReps !== undefined) m.tenant_reps = l.tenantReps;
  if (l.activeOpportunity !== undefined) m.active_opportunity = l.activeOpportunity;
  if (l.comp !== undefined) m.comp = l.comp;
  if (l.subleaseList !== undefined) m.sublease_list = l.subleaseList;
  if ((l as any).teamMembers !== undefined) m.team_members = (l as any).teamMembers;
  return m;
}

function toOpportunityRow(o: Partial<Opportunity>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (o.id !== undefined) m.id = o.id;
  if (o.companyId !== undefined) m.company_id = o.companyId;
  if (o.company !== undefined) m.company = o.company;
  if (o.contactId !== undefined) m.contact_id = o.contactId;
  if (o.contact !== undefined) m.contact = o.contact;
  if (o.stage !== undefined) m.stage = o.stage;
  if (o.squareFootage !== undefined) m.square_footage = o.squareFootage;
  if (o.targetMoveDate !== undefined) m.target_move_date = o.targetMoveDate;
  if (o.estimatedCommission !== undefined) m.estimated_commission = o.estimatedCommission;
  if (o.notes !== undefined) m.notes = o.notes;
  if ((o as any).teamMembers !== undefined) m.team_members = (o as any).teamMembers;
  return m;
}

function toActivityRow(a: Partial<Activity>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (a.id !== undefined) m.id = a.id;
  if (a.type !== undefined) m.type = a.type;
  if (a.date !== undefined) m.date = a.date;
  if (a.time !== undefined) m.time = a.time;
  if (a.priority !== undefined) m.priority = a.priority;
  if (a.contactId !== undefined) m.contact_id = a.contactId;
  if (a.contact !== undefined) m.contact = a.contact;
  if (a.companyId !== undefined) m.company_id = a.companyId;
  if (a.company !== undefined) m.company = a.company;
  if (a.officePhone !== undefined) m.office_phone = a.officePhone;
  if (a.ext !== undefined) m.ext = a.ext;
  if (a.mobilePhone !== undefined) m.mobile_phone = a.mobilePhone;
  if (a.email !== undefined) m.email = a.email;
  if (a.regarding !== undefined) m.regarding = a.regarding;
  if (a.addDate !== undefined) m.add_date = a.addDate;
  return m;
}

function toProspectRow(p: Partial<ProspectEntry>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (p.id !== undefined) m.id = p.id;
  if (p.companyId !== undefined) m.company_id = p.companyId;
  if (p.company !== undefined) m.company = p.company;
  if (p.industry !== undefined) m.industry = p.industry;
  if (p.nugget !== undefined) m.nugget = p.nugget;
  if (p.lastContactDate !== undefined) m.last_contact_date = p.lastContactDate;
  if (p.nextFollowUpDate !== undefined) m.next_follow_up_date = p.nextFollowUpDate;
  if (p.status !== undefined) m.status = p.status;
  if (p.teamLead !== undefined) m.team_lead = p.teamLead;
  if (p.list !== undefined) m.list = p.list;
  return m;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface DataContextType {
  companies: Company[];
  contacts: Contact[];
  leases: Lease[];
  buildings: Building[];
  opportunities: Opportunity[];
  activities: Activity[];
  prospects: ProspectEntry[];
  tasks: Task[];

  addCompany: (c: Company) => void;
  updateCompany: (id: string, partial: Partial<Company>) => void;
  deleteCompany: (id: string) => void;

  addContact: (c: Contact) => void;
  updateContact: (id: string, partial: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  addLease: (l: Lease) => void;
  updateLease: (id: string, partial: Partial<Lease>) => void;
  deleteLease: (id: string) => void;

  addBuilding: (b: Building) => void;
  updateBuilding: (id: string, partial: Partial<Building>) => void;
  deleteBuilding: (id: string) => void;

  addOpportunity: (o: Opportunity) => void;
  updateOpportunity: (id: string, partial: Partial<Opportunity>) => void;
  deleteOpportunity: (id: string) => void;

  addActivity: (a: Activity) => void;
  updateActivity: (id: string, partial: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;

  addProspect: (p: ProspectEntry) => void;
  updateProspect: (id: string, partial: Partial<ProspectEntry>) => void;
  deleteProspect: (id: string) => void;

  addTask: (t: Task) => void;
  updateTask: (id: string, partial: Partial<Task>) => void;
  deleteTask: (id: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function DataProvider({ children }: { children: ReactNode }) {
  // Initialize with seed data for SSR, then replace with Supabase data on mount
  const [companies, setCompanies] = useState<Company[]>(seedCompanies);
  const [contacts, setContacts] = useState<Contact[]>(seedContacts);
  const [leases, setLeases] = useState<Lease[]>(seedLeases);
  const [buildings, setBuildings] = useState<Building[]>(seedBuildings);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(seedOpportunities);
  const [activities, setActivities] = useState<Activity[]>(seedActivities);
  const [prospects, setProspects] = useState<ProspectEntry[]>(seedProspects);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);

  // Fetch all data from Supabase on mount
  useEffect(() => {
    async function fetchAll() {
      const [cRes, ctRes, bRes, lRes, oRes, aRes, pRes, tRes] = await Promise.all([
        supabase.from("companies").select("*"),
        supabase.from("contacts").select("*"),
        supabase.from("buildings").select("*"),
        supabase.from("leases").select("*"),
        supabase.from("opportunities").select("*"),
        supabase.from("activities").select("*"),
        supabase.from("prospect_entries").select("*"),
        supabase.from("tasks").select("*"),
      ]);

      if (cRes.data?.length) setCompanies(cRes.data.map(mapCompany));
      if (ctRes.data?.length) setContacts(ctRes.data.map(mapContact));
      if (bRes.data?.length) setBuildings(bRes.data.map(mapBuilding));
      if (lRes.data?.length) setLeases(lRes.data.map(mapLease));
      if (oRes.data?.length) setOpportunities(oRes.data.map(mapOpportunity));
      if (aRes.data?.length) setActivities(aRes.data.map(mapActivity));
      if (pRes.data?.length) setProspects(pRes.data.map(mapProspect));
      if (tRes.data?.length) setTasks(tRes.data.map((r: any) => r as Task));
    }
    fetchAll();
  }, []);

  // --- Company CRUD ---
  const addCompany = useCallback((c: Company) => {
    setCompanies((p) => [...p, c]);
    supabase.from("companies").insert(toCompanyRow(c)).then();
  }, []);
  const updateCompany = useCallback((id: string, partial: Partial<Company>) => {
    setCompanies((p) => p.map((x) => (x.id === id ? { ...x, ...partial } : x)));
    supabase.from("companies").update(toCompanyRow(partial)).eq("id", id).then();
  }, []);
  const deleteCompany = useCallback((id: string) => {
    setCompanies((p) => p.filter((x) => x.id !== id));
    supabase.from("companies").delete().eq("id", id).then();
  }, []);

  // --- Contact CRUD ---
  const addContact = useCallback((c: Contact) => {
    setContacts((p) => [...p, c]);
    supabase.from("contacts").insert(toContactRow(c)).then();
  }, []);
  const updateContact = useCallback((id: string, partial: Partial<Contact>) => {
    setContacts((p) => p.map((x) => (x.id === id ? { ...x, ...partial } : x)));
    supabase.from("contacts").update(toContactRow(partial)).eq("id", id).then();
  }, []);
  const deleteContact = useCallback((id: string) => {
    setContacts((p) => p.filter((x) => x.id !== id));
    supabase.from("contacts").delete().eq("id", id).then();
  }, []);

  // --- Lease CRUD ---
  const addLease = useCallback((l: Lease) => {
    setLeases((p) => [...p, l]);
    supabase.from("leases").insert(toLeaseRow(l)).then();
  }, []);
  const updateLease = useCallback((id: string, partial: Partial<Lease>) => {
    setLeases((p) => p.map((x) => (x.id === id ? { ...x, ...partial } : x)));
    supabase.from("leases").update(toLeaseRow(partial)).eq("id", id).then();
  }, []);
  const deleteLease = useCallback((id: string) => {
    setLeases((p) => p.filter((x) => x.id !== id));
    supabase.from("leases").delete().eq("id", id).then();
  }, []);

  // --- Building CRUD ---
  const addBuilding = useCallback((b: Building) => {
    setBuildings((p) => [...p, b]);
    supabase.from("buildings").insert(toBuildingRow(b)).then();
  }, []);
  const updateBuilding = useCallback((id: string, partial: Partial<Building>) => {
    setBuildings((p) => p.map((x) => (x.id === id ? { ...x, ...partial } : x)));
    supabase.from("buildings").update(toBuildingRow(partial)).eq("id", id).then();
  }, []);
  const deleteBuilding = useCallback((id: string) => {
    setBuildings((p) => p.filter((x) => x.id !== id));
    supabase.from("buildings").delete().eq("id", id).then();
  }, []);

  // --- Opportunity CRUD ---
  const addOpportunity = useCallback((o: Opportunity) => {
    setOpportunities((p) => [...p, o]);
    supabase.from("opportunities").insert(toOpportunityRow(o)).then();
  }, []);
  const updateOpportunity = useCallback((id: string, partial: Partial<Opportunity>) => {
    setOpportunities((p) => p.map((x) => (x.id === id ? { ...x, ...partial } : x)));
    supabase.from("opportunities").update(toOpportunityRow(partial)).eq("id", id).then();
  }, []);
  const deleteOpportunity = useCallback((id: string) => {
    setOpportunities((p) => p.filter((x) => x.id !== id));
    supabase.from("opportunities").delete().eq("id", id).then();
  }, []);

  // --- Activity CRUD ---
  const addActivity = useCallback((a: Activity) => {
    setActivities((p) => [...p, a]);
    supabase.from("activities").insert(toActivityRow(a)).then();
  }, []);
  const updateActivity = useCallback((id: string, partial: Partial<Activity>) => {
    setActivities((p) => p.map((x) => (x.id === id ? { ...x, ...partial } : x)));
    supabase.from("activities").update(toActivityRow(partial)).eq("id", id).then();
  }, []);
  const deleteActivity = useCallback((id: string) => {
    setActivities((p) => p.filter((x) => x.id !== id));
    supabase.from("activities").delete().eq("id", id).then();
  }, []);

  // --- Prospect CRUD ---
  const addProspect = useCallback((pe: ProspectEntry) => {
    setProspects((p) => [...p, pe]);
    supabase.from("prospect_entries").insert(toProspectRow(pe)).then();
  }, []);
  const updateProspect = useCallback((id: string, partial: Partial<ProspectEntry>) => {
    setProspects((p) => p.map((x) => (x.id === id ? { ...x, ...partial } : x)));
    supabase.from("prospect_entries").update(toProspectRow(partial)).eq("id", id).then();
  }, []);
  const deleteProspect = useCallback((id: string) => {
    setProspects((p) => p.filter((x) => x.id !== id));
    supabase.from("prospect_entries").delete().eq("id", id).then();
  }, []);

  // --- Task CRUD ---
  const addTask = useCallback((t: Task) => {
    setTasks((p) => [...p, t]);
    supabase.from("tasks").insert(t).then();
  }, []);
  const updateTask = useCallback((id: string, partial: Partial<Task>) => {
    setTasks((p) => p.map((x) => (x.id === id ? { ...x, ...partial } : x)));
    supabase.from("tasks").update(partial).eq("id", id).then();
  }, []);
  const deleteTask = useCallback((id: string) => {
    setTasks((p) => p.filter((x) => x.id !== id));
    supabase.from("tasks").delete().eq("id", id).then();
  }, []);

  return (
    <DataContext.Provider
      value={{
        companies, contacts, leases, buildings, opportunities, activities, prospects, tasks,
        addCompany, updateCompany, deleteCompany,
        addContact, updateContact, deleteContact,
        addLease, updateLease, deleteLease,
        addBuilding, updateBuilding, deleteBuilding,
        addOpportunity, updateOpportunity, deleteOpportunity,
        addActivity, updateActivity, deleteActivity,
        addProspect, updateProspect, deleteProspect,
        addTask, updateTask, deleteTask,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
