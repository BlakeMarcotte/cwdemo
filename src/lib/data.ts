// ============================================================================
// Cushman & Wakefield CRM Dashboard — Data Types & Seed Fallbacks
// Real data loaded from Supabase on mount
// ============================================================================

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type Relationship = "Prospect" | "Client" | "Past Client" | "Vendor" | "Competitor" | "Active Pursuit" | "Passive Pursuit";
export type Designation = "Decision Maker" | "Influencer" | "Coordinator" | "End User";
export type BuildingClass = "A" | "B" | "C";
export type OpportunityStage = "Lead" | "Qualified" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";
export type ActivityType = "Call" | "Update" | "Meeting";
export type Priority = "High" | "Medium" | "Low";
export type ProspectStatus = "Active" | "Cooling Off" | "Responded" | "Not Interested";
export type ProspectList = "focus" | "reserve";
export type TaskStatus = "To Do" | "In Progress" | "Done";
export type TodoEntityType = "company" | "contact" | "lease" | "building" | "opportunity" | "activity" | "prospect";

export const TEAM_MEMBERS = ["Michael Madden", "Tate Surtani", "Jonathan Metzel"];

export interface Company { id: string; name: string; mainPhone: string; website: string; hqAddress: string; city: string; state: string; relationship: Relationship[]; linkedIn: string; industry: string; locations: number; msaBrokerage: string[]; msaExpiration: string | null; spocContact: string[]; doNotContact: boolean; teamMembers: string[]; priority: number; nugget: string; outreachType: string; nextOutreach: string; outreachNotes: string; meetingNotes: string; companyResearch: string; portfolio: string; activeLeases: string; }
export interface Contact { id: string; companyId: string; company: string; name: string; title: string; contactAddress: string; officePhone: string; ext: number | null; mobilePhone: string; email: string; location: string; linkedIn: string; designation: Designation[]; teamMembers: string[]; }
export type LeaseStatus = "Uncategorized" | "Monitor - Long Term" | "Hot Pursuit" | "Active Pursuit" | "Meeting Scheduled" | "Monitor - Near Term" | "On Hold" | "Strategy" | "Touring" | "Negotiations" | "In Lease" | "Closed" | "Lost/Dead/Dud";
export interface Lease { id: string; companyId: string; company: string; buildingId: string; address: string; suites: string; city: string; zipCode: string; submarket: string; assetType: string; squareFootage: number; occupancy: string; moveInDate: string; leaseCommencement: string; terminationDate: string; leaseExpiration: string; agreement: string; tenantBrokerage: string[]; tenantReps: string[]; activeOpportunity: boolean; comp: boolean; subleaseList: boolean; teamMembers: string[]; status: LeaseStatus; commissionRate: number | null; commissionOverride: number | null; }
export interface Building { id: string; address: string; city: string; state: string; zipCode: string; submarket: string; squareFootage: number; buildingClass: BuildingClass; landlord: string[]; leasingBrokerage: string[]; leasingReps: string[]; teamMembers: string[]; rentPerSF: number | null; taxOperating: number | null; }
export interface Opportunity { id: string; companyId: string; company: string; contactId: string; contact: string; stage: OpportunityStage; squareFootage: number; targetMoveDate: string; estimatedCommission: number; notes: string; teamMembers: string[]; }
export interface Activity { id: string; type: ActivityType; date: string; time: string; priority: Priority; status: TaskStatus; dueDate: string; contactId: string; contact: string; companyId: string; company: string; officePhone: string; ext: number | null; mobilePhone: string; email: string; regarding: string; addDate: string; teamMembers: string[]; pinned: boolean; }
export interface ProspectEntry { id: string; companyId: string; company: string; industry: string; nugget: string; lastContactDate: string; nextFollowUpDate: string; status: ProspectStatus; teamLead: string; list: ProspectList; teamMembers: string[]; }

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
export interface QuarterGoal { quarter: Quarter; target: number; actual: number; }
export interface Goal { id: string; name: string; annualTarget: number; unit: string; format: "currency" | "number"; quarterGoals: QuarterGoal[]; year: number; }
export interface TodoItem { id: string; title: string; completed: boolean; position: number; entityType?: TodoEntityType; entityId?: string; entityName?: string; createdAt: string; }

// ---------------------------------------------------------------------------
// Seed data — empty arrays, real data loads from Supabase
// ---------------------------------------------------------------------------
export const companies: Company[] = [];
export const contacts: Contact[] = [];
export const buildings: Building[] = [];
export const leases: Lease[] = [];
export const opportunities: Opportunity[] = [];
export const activities: Activity[] = [];
export const prospectEntries: ProspectEntry[] = [];
export const todoItems: TodoItem[] = [];

// ---------------------------------------------------------------------------
// Goals (g1 – g4) — 2026 Annual Goals with Quarterly Breakdown
// ---------------------------------------------------------------------------
export const goals: Goal[] = [
  {
    id: "g1", name: "Commission Revenue", annualTarget: 4000000, unit: "$", format: "currency", year: 2026,
    quarterGoals: [
      { quarter: "Q1", target: 800000, actual: 1100000 },
      { quarter: "Q2", target: 1200000, actual: 320000 },
      { quarter: "Q3", target: 1000000, actual: 0 },
      { quarter: "Q4", target: 1000000, actual: 0 },
    ],
  },
  {
    id: "g2", name: "Deals Closed", annualTarget: 24, unit: "deals", format: "number", year: 2026,
    quarterGoals: [
      { quarter: "Q1", target: 5, actual: 7 },
      { quarter: "Q2", target: 7, actual: 2 },
      { quarter: "Q3", target: 6, actual: 0 },
      { quarter: "Q4", target: 6, actual: 0 },
    ],
  },
  {
    id: "g3", name: "New Clients", annualTarget: 12, unit: "clients", format: "number", year: 2026,
    quarterGoals: [
      { quarter: "Q1", target: 3, actual: 4 },
      { quarter: "Q2", target: 3, actual: 1 },
      { quarter: "Q3", target: 3, actual: 0 },
      { quarter: "Q4", target: 3, actual: 0 },
    ],
  },
  {
    id: "g4", name: "Square Footage Leased", annualTarget: 500000, unit: "SF", format: "number", year: 2026,
    quarterGoals: [
      { quarter: "Q1", target: 100000, actual: 135000 },
      { quarter: "Q2", target: 150000, actual: 28000 },
      { quarter: "Q3", target: 125000, actual: 0 },
      { quarter: "Q4", target: 125000, actual: 0 },
    ],
  },
];
