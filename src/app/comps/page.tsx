"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ArrowUpDown,
  Search,
  X,
  FileSpreadsheet,
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Crosshair,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import {
  activeComps as activeCompsSeed,
  oldComps as oldCompsSeed,
  type ActiveComp,
  type OldComp,
} from "@/lib/comps-data";

type Tab = "active" | "old";

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function fmtNum(v: number | null, decimals = 2): string {
  if (v == null) return "";
  return v.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtInt(v: number | null): string {
  if (v == null) return "";
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtDollar(v: number | null): string {
  if (v == null) return "";
  return "$" + fmtNum(v);
}

function fmtPct(v: number | null): string {
  if (v == null) return "";
  return (v * 100).toFixed(1) + "%";
}

function fmtAnnualIncrease(v: number | null): string {
  if (v == null) return "";
  if (v < 0.1) return (v * 100).toFixed(1) + "%";
  return "$" + fmtNum(v);
}

/* ------------------------------------------------------------------ */
/*  Select options for dropdown fields                                 */
/* ------------------------------------------------------------------ */

const TYPE_OPTIONS = ["Early Restructure", "New Lease", "Renewal", "Sublease"];
const FOOTPRINT_OPTIONS = ["Downsize", "Expand", "In Place"];
const ABATEMENT_TYPE_OPTIONS = ["Net", "Gross"];

const SELECT_FIELDS: Record<string, string[]> = {
  type: TYPE_OPTIONS,
  footprint: FOOTPRINT_OPTIONS,
  abatementType: ABATEMENT_TYPE_OPTIONS,
};

/* ------------------------------------------------------------------ */
/*  Comp scoring engine                                                */
/* ------------------------------------------------------------------ */

const SUBMARKET_OPTIONS = ["East West", "Evanston", "North", "Northwest", "O'Hare"];
const COUNTY_OPTIONS = ["Cook", "DuPage", "Kane", "Lake"];

export interface CompCriteria {
  submarket: string;
  county: string;
  leasedRSF: string;
  startingGrossRent: string;
  termMos: string;
  type: string;
  footprint: string;
}

const EMPTY_CRITERIA: CompCriteria = {
  submarket: "",
  county: "",
  leasedRSF: "",
  startingGrossRent: "",
  termMos: "",
  type: "",
  footprint: "",
};

interface ScoreBreakdown {
  total: number;
  maxPossible: number;
  pct: number;
  details: { label: string; pts: number; max: number }[];
}

function scoreComp(
  criteria: CompCriteria,
  comp: ActiveComp | OldComp
): ScoreBreakdown {
  const details: { label: string; pts: number; max: number }[] = [];
  let total = 0;
  let maxPossible = 0;

  // Submarket — exact match (25 pts)
  if (criteria.submarket) {
    const max = 25;
    maxPossible += max;
    const pts = comp.submarket === criteria.submarket ? max : 0;
    total += pts;
    details.push({ label: "Submarket", pts, max });
  }

  // Leased RSF — proximity (25 pts)
  if (criteria.leasedRSF) {
    const target = Number(criteria.leasedRSF);
    const max = 25;
    maxPossible += max;
    if (comp.leasedRSF != null && target > 0) {
      const ratio = Math.min(comp.leasedRSF, target) / Math.max(comp.leasedRSF, target);
      const pts = Math.round(ratio * max);
      total += pts;
      details.push({ label: "Size (RSF)", pts, max });
    } else {
      details.push({ label: "Size (RSF)", pts: 0, max });
    }
  }

  // Starting Gross Rent — proximity (20 pts)
  if (criteria.startingGrossRent) {
    const target = Number(criteria.startingGrossRent);
    const max = 20;
    maxPossible += max;
    if (comp.startingGrossRent != null && target > 0) {
      const ratio =
        Math.min(comp.startingGrossRent, target) /
        Math.max(comp.startingGrossRent, target);
      const pts = Math.round(ratio * max);
      total += pts;
      details.push({ label: "Gross Rent", pts, max });
    } else {
      details.push({ label: "Gross Rent", pts: 0, max });
    }
  }

  // Term — proximity (15 pts)
  if (criteria.termMos) {
    const target = Number(criteria.termMos);
    const max = 15;
    maxPossible += max;
    if (comp.termMos != null && target > 0) {
      const ratio = Math.min(comp.termMos, target) / Math.max(comp.termMos, target);
      const pts = Math.round(ratio * max);
      total += pts;
      details.push({ label: "Term", pts, max });
    } else {
      details.push({ label: "Term", pts: 0, max });
    }
  }

  // Type — exact match (10 pts)
  if (criteria.type) {
    const max = 10;
    maxPossible += max;
    const pts = comp.type === criteria.type ? max : 0;
    total += pts;
    details.push({ label: "Type", pts, max });
  }

  // Footprint — exact match (5 pts)
  if (criteria.footprint) {
    const max = 5;
    maxPossible += max;
    const pts = comp.footprint === criteria.footprint ? max : 0;
    total += pts;
    details.push({ label: "Footprint", pts, max });
  }

  // County — exact match (5 pts)
  if (criteria.county) {
    const max = 5;
    maxPossible += max;
    const pts = comp.county === criteria.county ? max : 0;
    total += pts;
    details.push({ label: "County", pts, max });
  }

  const pct = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
  return { total, maxPossible, pct, details };
}

function hasCriteria(c: CompCriteria): boolean {
  return Object.values(c).some((v) => v !== "");
}

/* ------------------------------------------------------------------ */
/*  Comp Finder panel                                                  */
/* ------------------------------------------------------------------ */

function CompFinder({
  criteria,
  onChange,
  onClear,
}: {
  criteria: CompCriteria;
  onChange: (c: CompCriteria) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = hasCriteria(criteria);

  function set(field: keyof CompCriteria, value: string) {
    onChange({ ...criteria, [field]: value });
  }

  return (
    <Card className={active ? "border-primary/50" : ""}>
      <CardHeader
        className="cursor-pointer py-3 px-4"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Crosshair size={14} className={active ? "text-primary" : "text-muted-foreground"} />
            <CardTitle className="text-sm">Find Comparable Properties</CardTitle>
            {active && (
              <Badge variant="default" className="text-[10px] bg-primary/20 text-primary border-primary/30 ml-1">
                Active
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Enter lease criteria to rank comps by similarity
          </span>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Submarket */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block font-medium">
                Submarket (25 pts)
              </label>
              <select
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                value={criteria.submarket}
                onChange={(e) => set("submarket", e.target.value)}
              >
                <option value="">Any</option>
                {SUBMARKET_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Leased RSF */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block font-medium">
                Leased RSF (25 pts)
              </label>
              <input
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                type="number"
                placeholder="e.g. 15000"
                value={criteria.leasedRSF}
                onChange={(e) => set("leasedRSF", e.target.value)}
              />
            </div>

            {/* Starting Gross Rent */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block font-medium">
                Gross Rent $/SF (20 pts)
              </label>
              <input
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                type="number"
                step="0.01"
                placeholder="e.g. 28.00"
                value={criteria.startingGrossRent}
                onChange={(e) => set("startingGrossRent", e.target.value)}
              />
            </div>

            {/* Term */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block font-medium">
                Term Months (15 pts)
              </label>
              <input
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                type="number"
                placeholder="e.g. 84"
                value={criteria.termMos}
                onChange={(e) => set("termMos", e.target.value)}
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block font-medium">
                Type (10 pts)
              </label>
              <select
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                value={criteria.type}
                onChange={(e) => set("type", e.target.value)}
              >
                <option value="">Any</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Footprint */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block font-medium">
                Footprint (5 pts)
              </label>
              <select
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                value={criteria.footprint}
                onChange={(e) => set("footprint", e.target.value)}
              >
                <option value="">Any</option>
                {FOOTPRINT_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* County */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block font-medium">
                County (5 pts)
              </label>
              <select
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                value={criteria.county}
                onChange={(e) => set("county", e.target.value)}
              >
                <option value="">Any</option>
                {COUNTY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            {active && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
              >
                <X size={12} className="mr-1" /> Clear Criteria
              </Button>
            )}
            <span className="text-[10px] text-muted-foreground">
              Fill in any combination — comps are scored only on the criteria you provide.
              The more fields you fill, the more precise the ranking.
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Score badge for match %                                            */
/* ------------------------------------------------------------------ */

function ScoreBadge({ score }: { score: ScoreBreakdown }) {
  const color =
    score.pct >= 80
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : score.pct >= 60
        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        : score.pct >= 40
          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
          : "bg-muted text-muted-foreground border-border";

  const tooltip = score.details
    .map((d) => `${d.label}: ${d.pts}/${d.max}`)
    .join("\n");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${color}`}
      title={tooltip}
    >
      {score.pct}%
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Editable cell                                                      */
/* ------------------------------------------------------------------ */

type CellId = { row: number; field: string } | null;

function EditableCell({
  value,
  field,
  rowIndex,
  editingCell,
  onStartEdit,
  onConfirm,
  onCancel,
  className,
  displayContent,
}: {
  value: string | number | null;
  field: string;
  rowIndex: number;
  editingCell: CellId;
  onStartEdit: (row: number, field: string) => void;
  onConfirm: (row: number, field: string, value: string) => void;
  onCancel: () => void;
  className?: string;
  displayContent?: React.ReactNode;
}) {
  const isEditing =
    editingCell?.row === rowIndex && editingCell?.field === field;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const [draft, setDraft] = useState("");

  const options = SELECT_FIELDS[field];

  useEffect(() => {
    if (isEditing) {
      setDraft(value != null ? String(value) : "");
      requestAnimationFrame(() => {
        if (options) {
          selectRef.current?.focus();
        } else {
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      });
    }
  }, [isEditing, value, options]);

  const confirm = useCallback(() => {
    onConfirm(rowIndex, field, draft);
  }, [onConfirm, rowIndex, field, draft]);

  if (isEditing) {
    if (options) {
      return (
        <TableCell className={className}>
          <div className="flex items-center gap-1">
            <select
              ref={selectRef}
              className="h-6 rounded border border-ring bg-background px-1 text-xs focus:outline-none min-w-[80px]"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                onConfirm(rowIndex, field, e.target.value);
              }}
              onBlur={confirm}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancel();
              }}
            >
              <option value="">—</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </TableCell>
      );
    }

    return (
      <TableCell className={className}>
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            className="h-6 rounded border border-ring bg-background px-1.5 text-xs focus:outline-none min-w-[60px] w-full"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirm();
              if (e.key === "Escape") onCancel();
            }}
            onBlur={confirm}
          />
          <button
            className="flex-shrink-0 p-0.5 rounded hover:bg-green-500/20 text-green-400"
            onMouseDown={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            <Check size={12} />
          </button>
        </div>
      </TableCell>
    );
  }

  return (
    <TableCell
      className={`${className ?? ""} cursor-default`}
      onDoubleClick={() => onStartEdit(rowIndex, field)}
    >
      {displayContent ?? (value != null ? String(value) : "")}
    </TableCell>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable column header                                             */
/* ------------------------------------------------------------------ */

type SortDir = "asc" | "desc";

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  currentKey: string | null;
  currentDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <TableHead
      className={`cursor-pointer select-none whitespace-nowrap hover:text-foreground ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          size={12}
          className={active ? "text-foreground" : "text-muted-foreground/40"}
        />
        {active && (
          <span className="text-[9px] text-muted-foreground">
            {currentDir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </span>
    </TableHead>
  );
}

/* ------------------------------------------------------------------ */
/*  Generic sort helper                                                */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortRows<T>(rows: T[], key: string | null, dir: SortDir): T[] {
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const av = (a as any)[key];
    const bv = (b as any)[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number")
      return dir === "asc" ? av - bv : bv - av;
    const as = String(av).toLowerCase();
    const bs = String(bv).toLowerCase();
    return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
  });
}

/* ------------------------------------------------------------------ */
/*  Badge helpers                                                      */
/* ------------------------------------------------------------------ */

function typeBadgeClass(type: string | null) {
  switch (type) {
    case "New Lease":
      return "bg-green-500/10 text-green-400 border-green-500/30";
    case "Sublease":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "Early Restructure":
      return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    case "Renewal":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    default:
      return "";
  }
}

function footprintBadgeClass(fp: string | null) {
  switch (fp) {
    case "Expand":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "Downsize":
      return "bg-orange-500/10 text-orange-400 border-orange-500/30";
    case "In Place":
      return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    default:
      return "";
  }
}

/* ------------------------------------------------------------------ */
/*  Active Comps table                                                 */
/* ------------------------------------------------------------------ */

function ActiveCompsTable({
  data,
  onUpdate,
  criteria,
}: {
  data: ActiveComp[];
  onUpdate: (origIndex: number, field: string, value: string) => void;
  criteria: CompCriteria;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterSubmarket, setFilterSubmarket] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFootprint, setFilterFootprint] = useState("");
  const [filterCounty, setFilterCounty] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [editingCell, setEditingCell] = useState<CellId>(null);

  const submarkets = useMemo(
    () => [...new Set(data.map((r) => r.submarket).filter(Boolean))].sort(),
    [data]
  );
  const types = useMemo(
    () => [...new Set(data.map((r) => r.type).filter(Boolean))].sort(),
    [data]
  );
  const footprints = useMemo(
    () => [...new Set(data.map((r) => r.footprint).filter(Boolean))].sort(),
    [data]
  );
  const counties = useMemo(
    () => [...new Set(data.map((r) => r.county).filter(Boolean))].sort(),
    [data]
  );
  const cities = useMemo(
    () => [...new Set(data.map((r) => r.city).filter(Boolean))].sort(),
    [data]
  );

  const ranking = hasCriteria(criteria);

  // Track original indices and scores through filtering/sorting
  const indexedData = useMemo(
    () =>
      data.map((r, i) => ({
        ...r,
        _idx: i,
        _score: ranking ? scoreComp(criteria, r) : null,
      })),
    [data, criteria, ranking]
  );

  const filtered = useMemo(() => {
    let rows = indexedData;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.tenantName?.toLowerCase().includes(q) ||
          r.property?.toLowerCase().includes(q) ||
          r.address?.toLowerCase().includes(q) ||
          r.owner?.toLowerCase().includes(q) ||
          r.tenantRepBroker?.toLowerCase().includes(q) ||
          r.tenantRepCompany?.toLowerCase().includes(q) ||
          r.comments?.toLowerCase().includes(q)
      );
    }
    if (filterSubmarket) rows = rows.filter((r) => r.submarket === filterSubmarket);
    if (filterType) rows = rows.filter((r) => r.type === filterType);
    if (filterFootprint) rows = rows.filter((r) => r.footprint === filterFootprint);
    if (filterCounty) rows = rows.filter((r) => r.county === filterCounty);
    if (filterCity) rows = rows.filter((r) => r.city === filterCity);
    // When ranking, auto-sort by score desc (unless user explicitly sorted)
    if (ranking && !sortKey) {
      return [...rows].sort((a, b) => (b._score?.pct ?? 0) - (a._score?.pct ?? 0));
    }
    return sortRows(rows, sortKey, sortDir);
  }, [indexedData, search, filterSubmarket, filterType, filterFootprint, filterCounty, filterCity, sortKey, sortDir, ranking]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const hasFilters = search || filterSubmarket || filterType || filterFootprint || filterCounty || filterCity;

  function clearFilters() {
    setSearch(""); setFilterSubmarket(""); setFilterType("");
    setFilterFootprint(""); setFilterCounty(""); setFilterCity("");
  }

  const handleConfirm = useCallback(
    (displayRow: number, field: string, value: string) => {
      const origIdx = filtered[displayRow]?._idx;
      if (origIdx != null) onUpdate(origIdx, field, value);
      setEditingCell(null);
    },
    [filtered, onUpdate]
  );

  const handleStartEdit = useCallback((row: number, field: string) => {
    setEditingCell({ row, field });
  }, []);

  const handleCancel = useCallback(() => setEditingCell(null), []);

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-8 rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-56"
            placeholder="Search tenant, property, address, owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={filterSubmarket} onChange={(e) => setFilterSubmarket(e.target.value)}>
          <option value="">All Submarkets</option>
          {submarkets.map((s) => <option key={s} value={s!}>{s}</option>)}
        </select>
        <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {types.map((t) => <option key={t} value={t!}>{t}</option>)}
        </select>
        <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={filterFootprint} onChange={(e) => setFilterFootprint(e.target.value)}>
          <option value="">All Footprints</option>
          {footprints.map((f) => <option key={f} value={f!}>{f}</option>)}
        </select>
        <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={filterCounty} onChange={(e) => setFilterCounty(e.target.value)}>
          <option value="">All Counties</option>
          {counties.map((c) => <option key={c} value={c!}>{c}</option>)}
        </select>
        <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
          <option value="">All Cities</option>
          {cities.map((c) => <option key={c} value={c!}>{c}</option>)}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearFilters}>
            <X size={14} className="mr-1" /> Clear
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {data.length} comps
          {ranking && " — ranked by match"}
        </span>
      </div>

      {/* Active Comps Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <ScrollableTable>
          <Table>
            <TableHeader>
              <TableRow>
                {ranking && <TableHead className="whitespace-nowrap text-center sticky left-0 z-10 bg-muted">Match</TableHead>}
                <SortHeader label="Date" sortKey="date" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Tenant Name" sortKey="tenantName" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Property" sortKey="property" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Address" sortKey="address" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="City" sortKey="city" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Submarket" sortKey="submarket" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="County" sortKey="county" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Leased RSF" sortKey="leasedRSF" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Type" sortKey="type" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Footprint" sortKey="footprint" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Execution Month" sortKey="executionMonth" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Lease Commence." sortKey="leaseCommenceDate" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Lease Expiration" sortKey="leaseExpirationDate" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Lease Termination" sortKey="leaseTerminationDate" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Term (Mos)" sortKey="termMos" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Starting Base Rent (NNN)" sortKey="startingBaseRentNNN" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Tax & Operating" sortKey="taxAndOperating" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Starting Gross Rent" sortKey="startingGrossRent" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Annual Increases" sortKey="annualIncreases" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="TIs ($/SF)" sortKey="tisSF" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="TIs ($/SF) Per Lease Yr" sortKey="tisSFPerLeaseYear" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Gross Rent Abatement" sortKey="grossRentAbatement" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Abatement Type" sortKey="abatementType" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Gross Abatement ($/SF)" sortKey="grossAbatementSF" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Mos. Abatement/Lease Yr" sortKey="mosAbatementPerLeaseYear" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Gross Abatement ($/SF)/Mo" sortKey="grossAbatementSFPerLeaseMonth" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Total Concession ($/SF)" sortKey="totalConcessionPackageSF" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Total Concession/Lease Yr" sortKey="totalConcessionPackageSFPerLeaseYear" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="% of Net Rent" sortKey="pctOfNetRent" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Owner" sortKey="owner" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Tenant Rep Company" sortKey="tenantRepCompany" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Tenant Rep Broker" sortKey="tenantRepBroker" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <TableHead className="whitespace-nowrap">Comments</TableHead>
                <SortHeader label="Source" sortKey="source" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={r._idx}>
                  {ranking && r._score && (
                    <TableCell className="text-center sticky left-0 z-10 bg-background border-r border-border/40">
                      <ScoreBadge score={r._score} />
                    </TableCell>
                  )}
                  <EditableCell value={r.date} field="date" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.tenantName} field="tenantName" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs font-medium whitespace-nowrap" />
                  <EditableCell value={r.property} field="property" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.address} field="address" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.city} field="city" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.submarket} field="submarket" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs whitespace-nowrap"
                    displayContent={r.submarket ? <Badge variant="outline" className="text-[10px] font-normal">{r.submarket}</Badge> : null}
                  />
                  <EditableCell value={r.county} field="county" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.leasedRSF} field="leasedRSF" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtInt(r.leasedRSF)} />
                  <EditableCell value={r.type} field="type" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs whitespace-nowrap"
                    displayContent={r.type ? <Badge variant="outline" className={`text-[10px] font-normal ${typeBadgeClass(r.type)}`}>{r.type}</Badge> : null}
                  />
                  <EditableCell value={r.footprint} field="footprint" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs whitespace-nowrap"
                    displayContent={r.footprint ? <Badge variant="outline" className={`text-[10px] font-normal ${footprintBadgeClass(r.footprint)}`}>{r.footprint}</Badge> : null}
                  />
                  <EditableCell value={r.executionMonth} field="executionMonth" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.leaseCommenceDate} field="leaseCommenceDate" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.leaseExpirationDate} field="leaseExpirationDate" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.leaseTerminationDate} field="leaseTerminationDate" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.termMos} field="termMos" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtInt(r.termMos)} />
                  <EditableCell value={r.startingBaseRentNNN} field="startingBaseRentNNN" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.startingBaseRentNNN)} />
                  <EditableCell value={r.taxAndOperating} field="taxAndOperating" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.taxAndOperating)} />
                  <EditableCell value={r.startingGrossRent} field="startingGrossRent" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-right tabular-nums whitespace-nowrap font-medium" displayContent={fmtDollar(r.startingGrossRent)} />
                  <EditableCell value={r.annualIncreases} field="annualIncreases" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtAnnualIncrease(r.annualIncreases)} />
                  <EditableCell value={r.tisSF} field="tisSF" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.tisSF)} />
                  <EditableCell value={r.tisSFPerLeaseYear} field="tisSFPerLeaseYear" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.tisSFPerLeaseYear)} />
                  <EditableCell value={r.grossRentAbatement} field="grossRentAbatement" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={r.grossRentAbatement != null ? fmtNum(r.grossRentAbatement, 0) : ""} />
                  <EditableCell value={r.abatementType} field="abatementType" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.grossAbatementSF} field="grossAbatementSF" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.grossAbatementSF)} />
                  <EditableCell value={r.mosAbatementPerLeaseYear} field="mosAbatementPerLeaseYear" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtNum(r.mosAbatementPerLeaseYear)} />
                  <EditableCell value={r.grossAbatementSFPerLeaseMonth} field="grossAbatementSFPerLeaseMonth" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.grossAbatementSFPerLeaseMonth)} />
                  <EditableCell value={r.totalConcessionPackageSF} field="totalConcessionPackageSF" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-right tabular-nums whitespace-nowrap font-medium" displayContent={fmtDollar(r.totalConcessionPackageSF)} />
                  <EditableCell value={r.totalConcessionPackageSFPerLeaseYear} field="totalConcessionPackageSFPerLeaseYear" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.totalConcessionPackageSFPerLeaseYear)} />
                  <EditableCell value={r.pctOfNetRent} field="pctOfNetRent" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtPct(r.pctOfNetRent)} />
                  <EditableCell value={r.owner} field="owner" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.tenantRepCompany} field="tenantRepCompany" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.tenantRepBroker} field="tenantRepBroker" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.comments} field="comments" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground max-w-[300px] truncate" displayContent={<span title={r.comments ?? undefined}>{r.comments}</span>} />
                  <EditableCell value={r.source} field="source" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollableTable>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Old Comps table                                                    */
/* ------------------------------------------------------------------ */

function OldCompsTable({
  data,
  onUpdate,
  criteria,
}: {
  data: OldComp[];
  onUpdate: (origIndex: number, field: string, value: string) => void;
  criteria: CompCriteria;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterSubmarket, setFilterSubmarket] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFootprint, setFilterFootprint] = useState("");
  const [editingCell, setEditingCell] = useState<CellId>(null);

  const submarkets = useMemo(
    () => [...new Set(data.map((r) => r.submarket).filter(Boolean))].sort(),
    [data]
  );
  const types = useMemo(
    () => [...new Set(data.map((r) => r.type).filter(Boolean))].sort(),
    [data]
  );
  const footprints = useMemo(
    () => [...new Set(data.map((r) => r.footprint).filter(Boolean))].sort(),
    [data]
  );

  const ranking = hasCriteria(criteria);

  const indexedData = useMemo(
    () =>
      data.map((r, i) => ({
        ...r,
        _idx: i,
        _score: ranking ? scoreComp(criteria, r) : null,
      })),
    [data, criteria, ranking]
  );

  const filtered = useMemo(() => {
    let rows = indexedData;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.tenantName?.toLowerCase().includes(q) ||
          r.property?.toLowerCase().includes(q) ||
          r.address?.toLowerCase().includes(q) ||
          r.owner?.toLowerCase().includes(q) ||
          r.tenantRepBroker?.toLowerCase().includes(q) ||
          r.comments?.toLowerCase().includes(q)
      );
    }
    if (filterSubmarket) rows = rows.filter((r) => r.submarket === filterSubmarket);
    if (filterType) rows = rows.filter((r) => r.type === filterType);
    if (filterFootprint) rows = rows.filter((r) => r.footprint === filterFootprint);
    if (ranking && !sortKey) {
      return [...rows].sort((a, b) => (b._score?.pct ?? 0) - (a._score?.pct ?? 0));
    }
    return sortRows(rows, sortKey, sortDir);
  }, [indexedData, search, filterSubmarket, filterType, filterFootprint, sortKey, sortDir, ranking]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const hasFilters = search || filterSubmarket || filterType || filterFootprint;

  function clearFilters() {
    setSearch(""); setFilterSubmarket(""); setFilterType(""); setFilterFootprint("");
  }

  const handleConfirm = useCallback(
    (displayRow: number, field: string, value: string) => {
      const origIdx = filtered[displayRow]?._idx;
      if (origIdx != null) onUpdate(origIdx, field, value);
      setEditingCell(null);
    },
    [filtered, onUpdate]
  );

  const handleStartEdit = useCallback((row: number, field: string) => {
    setEditingCell({ row, field });
  }, []);

  const handleCancel = useCallback(() => setEditingCell(null), []);

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-8 rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-56"
            placeholder="Search tenant, property, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={filterSubmarket} onChange={(e) => setFilterSubmarket(e.target.value)}>
          <option value="">All Submarkets</option>
          {submarkets.map((s) => <option key={s} value={s!}>{s}</option>)}
        </select>
        <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {types.map((t) => <option key={t} value={t!}>{t}</option>)}
        </select>
        <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={filterFootprint} onChange={(e) => setFilterFootprint(e.target.value)}>
          <option value="">All Footprints</option>
          {footprints.map((f) => <option key={f} value={f!}>{f}</option>)}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearFilters}>
            <X size={14} className="mr-1" /> Clear
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {data.length} comps
          {ranking && " — ranked by match"}
        </span>
      </div>

      {/* Old Comps Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <ScrollableTable>
          <Table>
            <TableHeader>
              <TableRow>
                {ranking && <TableHead className="whitespace-nowrap text-center sticky left-0 z-10 bg-muted">Match</TableHead>}
                <SortHeader label="Date" sortKey="date" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Tenant Name" sortKey="tenantName" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Property" sortKey="property" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Address" sortKey="address" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="City" sortKey="city" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Submarket" sortKey="submarket" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="County" sortKey="county" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Leased RSF" sortKey="leasedRSF" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Type" sortKey="type" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Footprint" sortKey="footprint" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Execution Month" sortKey="executionMonth" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Lease Commence." sortKey="leaseCommenceDate" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Lease Expiration" sortKey="leaseExpirationDate" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Lease Termination" sortKey="leaseTerminationDate" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Term (Mos)" sortKey="termMos" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Starting Base Rent (NNN)" sortKey="startingBaseRentNNN" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Tax & Operating" sortKey="taxAndOperating" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Starting Gross Rent" sortKey="startingGrossRent" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Annual Increases" sortKey="annualIncreases" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="TIs ($/SF)" sortKey="tisSF" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="TIs ($/SF) Per Lease Yr" sortKey="tisSFPerLeaseYear" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Gross Rent Abatement" sortKey="grossRentAbatement" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Abatement Type" sortKey="abatementType" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Gross Abatement ($/SF)" sortKey="grossAbatementSF" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Mos. Abatement/Lease Yr" sortKey="mosAbatementPerLeaseYear" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Gross Abatement ($/SF)/Yr" sortKey="grossAbatementSFPerLeaseYear" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Total Concession ($/SF)" sortKey="totalConcessionPackageSF" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Total Concession/Lease Yr" sortKey="totalConcessionPackageSFPerLeaseYear" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Owner" sortKey="owner" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Tenant Rep Company" sortKey="tenantRepCompany" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Tenant Rep Broker" sortKey="tenantRepBroker" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                <TableHead className="whitespace-nowrap">Comments</TableHead>
                <SortHeader label="Source" sortKey="source" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={r._idx}>
                  {ranking && r._score && (
                    <TableCell className="text-center sticky left-0 z-10 bg-background border-r border-border/40">
                      <ScoreBadge score={r._score} />
                    </TableCell>
                  )}
                  <EditableCell value={r.date} field="date" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.tenantName} field="tenantName" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs font-medium whitespace-nowrap" />
                  <EditableCell value={r.property} field="property" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.address} field="address" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.city} field="city" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.submarket} field="submarket" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs whitespace-nowrap"
                    displayContent={r.submarket ? <Badge variant="outline" className="text-[10px] font-normal">{r.submarket}</Badge> : null}
                  />
                  <EditableCell value={r.county} field="county" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.leasedRSF} field="leasedRSF" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtInt(r.leasedRSF)} />
                  <EditableCell value={r.type} field="type" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs whitespace-nowrap"
                    displayContent={r.type ? <Badge variant="outline" className={`text-[10px] font-normal ${typeBadgeClass(r.type)}`}>{r.type}</Badge> : null}
                  />
                  <EditableCell value={r.footprint} field="footprint" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs whitespace-nowrap"
                    displayContent={r.footprint ? <Badge variant="outline" className={`text-[10px] font-normal ${footprintBadgeClass(r.footprint)}`}>{r.footprint}</Badge> : null}
                  />
                  <EditableCell value={r.executionMonth} field="executionMonth" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.leaseCommenceDate} field="leaseCommenceDate" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.leaseExpirationDate} field="leaseExpirationDate" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.leaseTerminationDate} field="leaseTerminationDate" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.termMos} field="termMos" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtInt(r.termMos)} />
                  <EditableCell value={r.startingBaseRentNNN} field="startingBaseRentNNN" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.startingBaseRentNNN)} />
                  <EditableCell value={r.taxAndOperating} field="taxAndOperating" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.taxAndOperating)} />
                  <EditableCell value={r.startingGrossRent} field="startingGrossRent" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-right tabular-nums whitespace-nowrap font-medium" displayContent={fmtDollar(r.startingGrossRent)} />
                  <EditableCell value={r.annualIncreases} field="annualIncreases" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtAnnualIncrease(r.annualIncreases)} />
                  <EditableCell value={r.tisSF} field="tisSF" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.tisSF)} />
                  <EditableCell value={r.tisSFPerLeaseYear} field="tisSFPerLeaseYear" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.tisSFPerLeaseYear)} />
                  <EditableCell value={r.grossRentAbatement} field="grossRentAbatement" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={r.grossRentAbatement != null ? fmtNum(r.grossRentAbatement, 0) : ""} />
                  <EditableCell value={r.abatementType} field="abatementType" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.grossAbatementSF} field="grossAbatementSF" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.grossAbatementSF)} />
                  <EditableCell value={r.mosAbatementPerLeaseYear} field="mosAbatementPerLeaseYear" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtNum(r.mosAbatementPerLeaseYear)} />
                  <EditableCell value={r.grossAbatementSFPerLeaseYear} field="grossAbatementSFPerLeaseYear" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.grossAbatementSFPerLeaseYear)} />
                  <EditableCell value={r.totalConcessionPackageSF} field="totalConcessionPackageSF" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-right tabular-nums whitespace-nowrap font-medium" displayContent={fmtDollar(r.totalConcessionPackageSF)} />
                  <EditableCell value={r.totalConcessionPackageSFPerLeaseYear} field="totalConcessionPackageSFPerLeaseYear" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground text-right tabular-nums whitespace-nowrap" displayContent={fmtDollar(r.totalConcessionPackageSFPerLeaseYear)} />
                  <EditableCell value={r.owner} field="owner" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.tenantRepCompany} field="tenantRepCompany" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.tenantRepBroker} field="tenantRepBroker" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                  <EditableCell value={r.comments} field="comments" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground max-w-[300px] truncate" displayContent={<span title={r.comments ?? undefined}>{r.comments}</span>} />
                  <EditableCell value={r.source} field="source" rowIndex={i} editingCell={editingCell} onStartEdit={handleStartEdit} onConfirm={handleConfirm} onCancel={handleCancel} className="text-xs text-muted-foreground whitespace-nowrap" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollableTable>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Numeric fields — updated value is parsed back to number            */
/* ------------------------------------------------------------------ */

const NUMERIC_FIELDS = new Set([
  "leasedRSF", "termMos", "startingBaseRentNNN", "taxAndOperating",
  "startingGrossRent", "annualIncreases", "tisSF", "tisSFPerLeaseYear",
  "grossRentAbatement", "grossAbatementSF", "mosAbatementPerLeaseYear",
  "grossAbatementSFPerLeaseMonth", "grossAbatementSFPerLeaseYear",
  "totalConcessionPackageSF", "totalConcessionPackageSFPerLeaseYear",
  "pctOfNetRent",
]);

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function CompsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [activeData, setActiveData] = useState<ActiveComp[]>(() => [...activeCompsSeed]);
  const [oldData, setOldData] = useState<OldComp[]>(() => [...oldCompsSeed]);
  const [criteria, setCriteria] = useState<CompCriteria>(EMPTY_CRITERIA);

  const totalActiveSF = useMemo(
    () => activeData.reduce((s, r) => s + (r.leasedRSF ?? 0), 0),
    [activeData]
  );
  const totalOldSF = useMemo(
    () => oldData.reduce((s, r) => s + (r.leasedRSF ?? 0), 0),
    [oldData]
  );

  const handleActiveUpdate = useCallback(
    (index: number, field: string, raw: string) => {
      setActiveData((prev) => {
        const next = [...prev];
        const row = { ...next[index] };
        if (NUMERIC_FIELDS.has(field)) {
          (row as any)[field] = raw === "" ? null : Number(raw);
        } else {
          (row as any)[field] = raw === "" ? null : raw;
        }
        next[index] = row;
        return next;
      });
    },
    []
  );

  const handleOldUpdate = useCallback(
    (index: number, field: string, raw: string) => {
      setOldData((prev) => {
        const next = [...prev];
        const row = { ...next[index] };
        if (NUMERIC_FIELDS.has(field)) {
          (row as any)[field] = raw === "" ? null : Number(raw);
        } else {
          (row as any)[field] = raw === "" ? null : raw;
        }
        next[index] = row;
        return next;
      });
    },
    []
  );

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Comps</h1>
          <span className="text-xs text-muted-foreground">
            Comparable lease transactions
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{activeData.length}</span> active
          </span>
          <span>
            <span className="font-medium text-foreground">{oldData.length}</span> archived
          </span>
          <span>
            <span className="font-medium text-foreground">{(totalActiveSF + totalOldSF).toLocaleString()}</span> total RSF
          </span>
        </div>
      </div>

      {/* Comp Finder */}
      <CompFinder
        criteria={criteria}
        onChange={setCriteria}
        onClear={() => setCriteria(EMPTY_CRITERIA)}
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "active"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("active")}
        >
          <FileSpreadsheet size={14} />
          Active Comps
          <Badge variant="secondary" className="ml-1 text-[10px]">
            {activeData.length}
          </Badge>
        </button>
        <button
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "old"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("old")}
        >
          <Archive size={14} />
          Old Comps
          <Badge variant="secondary" className="ml-1 text-[10px]">
            {oldData.length}
          </Badge>
        </button>
      </div>

      {/* Tab content */}
      {tab === "active" ? (
        <ActiveCompsTable data={activeData} onUpdate={handleActiveUpdate} criteria={criteria} />
      ) : (
        <OldCompsTable data={oldData} onUpdate={handleOldUpdate} criteria={criteria} />
      )}
    </div>
  );
}
