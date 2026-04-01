"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Target,
  TrendingUp,
  Calendar,
  Phone,
  Users,
  FileText,
  CheckSquare2,
  Square,
  Plus,
  X,
  ListTodo,
  Crosshair,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData, genId } from "@/lib/data-context";
import type { ActivityType, OpportunityStage, Goal, Quarter } from "@/lib/data";

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

function formatGoalValue(value: number, goal: Goal) {
  if (goal.format === "currency") {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value}`;
}

function getCurrentQuarter(): Quarter {
  const month = new Date().getMonth();
  if (month < 3) return "Q1";
  if (month < 6) return "Q2";
  if (month < 9) return "Q3";
  return "Q4";
}

const quarterOrder: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

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

const entityRoutes: Record<string, string> = {
  company: "/companies",
  contact: "/contacts",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const {
    companies,
    contacts,
    opportunities,
    activities,
    prospects,
    todoItems,
    addTodoItem,
    updateTodoItem,
    deleteTodoItem,
    goals,
  } = useData();

  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [showAddTodo, setShowAddTodo] = useState(false);

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

  // To-Do items sorted by position, max 10
  const sortedTodos = [...todoItems]
    .sort((a, b) => a.position - b.position)
    .slice(0, 10);

  const todoDoneCount = sortedTodos.filter((t) => t.completed).length;

  function handleAddTodo() {
    if (!newTodoTitle.trim()) return;
    const maxPos = todoItems.length > 0
      ? Math.max(...todoItems.map((t) => t.position))
      : 0;
    addTodoItem({
      id: genId("td"),
      title: newTodoTitle.trim(),
      completed: false,
      position: maxPos + 1,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setNewTodoTitle("");
    setShowAddTodo(false);
  }

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

        {/* To-Do List + Pipeline Overview */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Top 10 To-Do */}
          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-blue-400" />
                  <CardTitle className="text-sm font-medium text-foreground/80">
                    To-Do List
                  </CardTitle>
                  <span className="text-[10px] text-muted-foreground">
                    {todoDoneCount}/{sortedTodos.length} done
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowAddTodo(!showAddTodo)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add new todo input */}
              {showAddTodo && (
                <div className="mb-2 flex gap-1.5">
                  <Input
                    className="h-7 text-xs"
                    placeholder="Add a to-do item..."
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTodo();
                      if (e.key === "Escape") setShowAddTodo(false);
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleAddTodo}
                  >
                    Add
                  </Button>
                </div>
              )}

              {/* Todo items */}
              <div className="space-y-0.5">
                {sortedTodos.map((todo) => {
                  const route =
                    todo.entityType && todo.entityId && entityRoutes[todo.entityType]
                      ? `${entityRoutes[todo.entityType]}/${todo.entityId}`
                      : null;
                  return (
                    <div
                      key={todo.id}
                      className="group flex items-start gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/40"
                    >
                      <button
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() =>
                          updateTodoItem(todo.id, {
                            completed: !todo.completed,
                          })
                        }
                      >
                        {todo.completed ? (
                          <CheckSquare2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Square className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs leading-snug ${
                            todo.completed
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {todo.title}
                        </p>
                        {todo.entityName && (
                          <div className="mt-0.5">
                            {route ? (
                              <Link href={route}>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-normal bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 cursor-pointer"
                                >
                                  {todo.entityName}
                                </Badge>
                              </Link>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-normal bg-muted text-muted-foreground border-border"
                              >
                                {todo.entityName}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                        onClick={() => deleteTodoItem(todo.id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                {sortedTodos.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No to-do items yet. Click + to add one.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Overview */}
          <Card className="border-border bg-card lg:col-span-3">
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
        </div>

        {/* Annual Goals */}
        <Card className="mt-4 border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-sm font-medium text-foreground/80">
                Annual Goals — {goals[0]?.year ?? new Date().getFullYear()}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {goals.map((goal) => {
                const annualActual = goal.quarterGoals.reduce(
                  (sum, q) => sum + q.actual,
                  0
                );
                const annualPct = Math.min(
                  Math.round((annualActual / goal.annualTarget) * 100),
                  100
                );
                const currentQ = getCurrentQuarter();
                const currentQIdx = quarterOrder.indexOf(currentQ);

                return (
                  <div key={goal.id} className="space-y-2">
                    {/* Goal header */}
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {goal.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatGoalValue(annualActual, goal)}{" "}
                        <span className="text-foreground/40">/</span>{" "}
                        {formatGoalValue(goal.annualTarget, goal)}
                        <span className="ml-1.5 font-medium text-foreground/70">
                          {annualPct}%
                        </span>
                      </span>
                    </div>

                    {/* Annual progress bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                      <div
                        className={`h-full rounded-full transition-all ${
                          annualPct >= 100
                            ? "bg-emerald-500"
                            : annualPct >= 50
                              ? "bg-blue-500"
                              : "bg-amber-500"
                        }`}
                        style={{ width: `${annualPct}%` }}
                      />
                    </div>

                    {/* Quarter breakdown */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {goal.quarterGoals.map((qg, idx) => {
                        const qPct = qg.target > 0
                          ? Math.min(
                              Math.round((qg.actual / qg.target) * 100),
                              100
                            )
                          : 0;
                        const isPast = idx < currentQIdx;
                        const isCurrent = idx === currentQIdx;
                        const barColor = isPast
                          ? qg.actual >= qg.target
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                          : isCurrent
                            ? "bg-blue-500"
                            : "bg-muted-foreground/30";

                        return (
                          <div key={qg.quarter} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[10px] font-medium ${
                                  isCurrent
                                    ? "text-blue-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {qg.quarter}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatGoalValue(qg.actual, goal)}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{
                                  width: `${isPast || isCurrent ? qPct : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
