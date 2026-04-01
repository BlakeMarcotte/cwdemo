"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Pencil,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useData, genId } from "@/lib/data-context";
import { EditDialog, type FieldDef } from "@/components/edit-dialog";
import { TEAM_MEMBERS } from "@/lib/data";
import type { TaskStatus } from "@/lib/data";

const statusConfig: Record<
  TaskStatus,
  { color: string; icon: typeof Circle }
> = {
  "To Do": { color: "bg-muted text-muted-foreground", icon: Circle },
  "In Progress": {
    color: "bg-blue-500/20 text-blue-300",
    icon: Clock,
  },
  Done: {
    color: "bg-green-500/20 text-green-300",
    icon: CheckCircle2,
  },
};

const priorityBadge: Record<string, string> = {
  High: "bg-red-500/20 text-red-300",
  Medium: "bg-yellow-500/20 text-yellow-300",
  Low: "bg-green-500/20 text-green-300",
};

const taskFields: FieldDef[] = [
  { key: "title", label: "Title", type: "text", placeholder: "Task title" },
  { key: "description", label: "Description", type: "textarea" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["To Do", "In Progress", "Done"],
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: ["High", "Medium", "Low"],
  },
  { key: "dueDate", label: "Due Date", type: "date" },
  {
    key: "teamMembers",
    label: "Team",
    type: "multi-select",
    options: TEAM_MEMBERS,
  },
  { key: "company", label: "Company", type: "text", placeholder: "Optional" },
  { key: "companyId", label: "Company ID", type: "text", placeholder: "Optional" },
];

type FilterStatus = "All" | TaskStatus;

export default function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask } = useData();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("All");

  const filtered = useMemo(() => {
    const list = filter === "All" ? tasks : tasks.filter((t) => t.status === filter);
    return [...list].sort((a, b) => {
      const statusOrder: Record<string, number> = { "In Progress": 0, "To Do": 1, Done: 2 };
      const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      const sDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (sDiff !== 0) return sDiff;
      return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    });
  }, [tasks, filter]);

  const todoCount = tasks.filter((t) => t.status === "To Do").length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const doneCount = tasks.filter((t) => t.status === "Done").length;

  function openEdit(task: (typeof tasks)[number]) {
    setEditId(task.id);
    setEditValues({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      teamMembers: task.teamMembers ?? [],
      company: task.company,
      companyId: task.companyId,
    });
    setEditOpen(true);
  }

  const filters: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "All" },
    { label: "To Do", value: "To Do" },
    { label: "In Progress", value: "In Progress" },
    { label: "Done", value: "Done" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tasks</h1>
        <Button size="sm" className="gap-1" onClick={() => setAddOpen(true)}>
          <Plus size={14} />
          Add Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Circle size={18} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">To Do</p>
              <p className="text-lg font-bold text-foreground">{todoCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
              <Clock size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">In Progress</p>
              <p className="text-lg font-bold text-foreground">{inProgressCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/15">
              <CheckCircle2 size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Done</p>
              <p className="text-lg font-bold text-foreground">{doneCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[80px]">Priority</TableHead>
              <TableHead className="w-[100px]">Due Date</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="w-[150px]">Team</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((task) => {
              const cfg = statusConfig[task.status];
              const StatusIcon = cfg.icon;
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <button
                      className="p-0.5"
                      onClick={() => {
                        const next: Record<TaskStatus, TaskStatus> = {
                          "To Do": "In Progress",
                          "In Progress": "Done",
                          Done: "To Do",
                        };
                        updateTask(task.id, { status: next[task.status] });
                      }}
                    >
                      <StatusIcon
                        size={16}
                        className={
                          task.status === "Done"
                            ? "text-green-400"
                            : task.status === "In Progress"
                              ? "text-blue-400"
                              : "text-muted-foreground"
                        }
                      />
                    </button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p
                        className={`text-xs font-medium ${task.status === "Done" ? "line-through text-muted-foreground" : "text-foreground"}`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${priorityBadge[task.priority]} border-0 text-[10px] px-1.5`}
                    >
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {task.dueDate}
                  </TableCell>
                  <TableCell className="text-xs">
                    {task.companyId ? (
                      <Link
                        href={`/companies/${task.companyId}`}
                        className="text-cw-green hover:underline"
                      >
                        {task.company}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{task.company || "\u2014"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(task.teamMembers ?? []).map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0 text-[10px] text-indigo-400"
                        >
                          {m.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(task)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <ClipboardList
                    size={32}
                    className="mx-auto text-muted-foreground/40 mb-2"
                  />
                  <p className="text-sm text-muted-foreground">No tasks found.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Task Dialog */}
      <EditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Task"
        fields={taskFields}
        values={{ status: "To Do", priority: "Medium", teamMembers: [] }}
        onSave={(formValues) => {
          addTask({
            ...formValues,
            id: genId("t"),
            createdDate: new Date().toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            }),
          } as any);
        }}
      />

      {/* Edit Task Dialog */}
      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Task"
        fields={taskFields}
        values={editValues}
        onSave={(formValues) => {
          if (editId) updateTask(editId, formValues as any);
        }}
      />
    </div>
  );
}
