"use client";

import {
  Building2,
  Target,
  TrendingUp,
  Calendar,
  Phone,
  Users,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/data-context";
import type { ActivityType, OpportunityStage } from "@/lib/data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysUntil(iso: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  const diff = Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return `In ${diff}d`;
}

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

const stages: OpportunityStage[] = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

const stageColors: Record<OpportunityStage, string> = {
  Lead: "bg-muted-foreground",
  Qualified: "bg-blue-500",
  Proposal: "bg-amber-500",
  Negotiation: "bg-purple-500",
  "Closed Won": "bg-emerald-500",
  "Closed Lost": "bg-red-500/70",
};

const activityBadgeStyle: Record<ActivityType, string> = {
  Call: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Meeting: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Update: "bg-muted text-muted-foreground border-border",
};

const activityIcon: Record<ActivityType, typeof Phone> = {
  Call: Phone,
  Meeting: Users,
  Update: FileText,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { companies, contacts, opportunities, activities, prospects } = useData();

  // Derived data
  const totalCompanies = companies.length;
  const activeProspects = prospects.filter((p) => p.list === "focus").length;
  const pipelineDeals = opportunities.filter(
    (o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost"
  ).length;
  const activityCount = activities.length;

  const stageCounts = stages.map((stage) => ({
    stage,
    count: opportunities.filter((o) => o.stage === stage).length,
  }));
  const maxStageCount = Math.max(...stageCounts.map((s) => s.count), 1);

  // Recent activities (8 most recent)
  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  // Focus prospects sorted by follow-up date
  const upcomingFollowUps = [...prospects]
    .filter((p) => p.list === "focus")
    .sort(
      (a, b) =>
        new Date(a.nextFollowUpDate).getTime() -
        new Date(b.nextFollowUpDate).getTime()
    )
    .slice(0, 6);

  const summaryCards = [
    {
      label: "Total Companies",
      value: totalCompanies,
      icon: Building2,
      accent: "text-blue-400",
    },
    {
      label: "Active Prospects",
      value: activeProspects,
      icon: Target,
      accent: "text-emerald-400",
    },
    {
      label: "Deals in Pipeline",
      value: pipelineDeals,
      icon: TrendingUp,
      accent: "text-amber-400",
    },
    {
      label: "Activities This Week",
      value: activityCount,
      icon: Calendar,
      accent: "text-purple-400",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Cushman &amp; Wakefield CRM Overview
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                               className="border-border bg-card"
              >
                <CardHeader className="pb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${card.accent}`} />
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      {card.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {card.value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pipeline Overview */}
        <Card className="mt-4 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground/80">
              Pipeline Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {stageCounts.map(({ stage, count }) => (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                    {stage}
                  </span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-5 flex-1 overflow-hidden rounded bg-muted/50">
                      <div
                        className={`h-full rounded ${stageColors[stage]} transition-all`}
                        style={{
                          width: `${(count / maxStageCount) * 100}%`,
                          minWidth: count > 0 ? "1rem" : "0",
                        }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-medium text-foreground/80">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Row: Activity Feed + Follow-ups */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Recent Activity Feed */}
          <Card className="border-border bg-card lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground/80">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {recentActivities.map((activity) => {
                  const Icon = activityIcon[activity.type];
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/40"
                    >
                      <div className="mt-0.5 shrink-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[10px] font-medium ${activityBadgeStyle[activity.type]}`}
                          >
                            {activity.type}
                          </Badge>
                          <span className="text-xs font-medium text-foreground">
                            {activity.contact}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {activity.company}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {activity.regarding}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatDate(activity.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Follow-ups */}
          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground/80">
                Upcoming Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {upcomingFollowUps.map((prospect) => {
                  const urgency = daysUntil(prospect.nextFollowUpDate);
                  const isOverdue = urgency.includes("overdue");
                  const isToday = urgency === "Today";
                  return (
                    <div
                      key={prospect.id}
                      className="rounded-md px-2 py-2 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          {prospect.company}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            isOverdue
                              ? "text-red-400"
                              : isToday
                                ? "text-amber-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {urgency}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {prospect.nugget}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {prospect.teamLead}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(prospect.nextFollowUpDate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
