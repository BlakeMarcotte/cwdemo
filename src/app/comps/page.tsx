"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  ChevronDown,
  ChevronRight,
  Building2,
  MapPin,
  Ruler,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { useData } from "@/lib/data-context";
import type { Opportunity, Lease } from "@/lib/data";

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatSF(n: number): string {
  return `${n.toLocaleString()} SF`;
}

/** Find comparable leases for a closed opportunity. */
function findComps(opp: Opportunity, leases: Lease[]): Lease[] {
  // Get the leases for the same company (to know the submarket / asset type)
  const companyLeases = leases.filter((l) => l.companyId === opp.companyId);
  const submarkets = new Set(companyLeases.map((l) => l.submarket));
  const assetTypes = new Set(companyLeases.map((l) => l.assetType));

  // SF range: +/- 60% of the opportunity's square footage
  const sfLow = opp.squareFootage * 0.4;
  const sfHigh = opp.squareFootage * 1.6;

  return leases.filter((l) => {
    // Exclude the winning company's own leases
    if (l.companyId === opp.companyId) return false;
    // Prefer leases marked as comps, or match on submarket + asset type + SF
    const marketMatch = submarkets.has(l.submarket);
    const typeMatch = assetTypes.has(l.assetType);
    const sizeMatch = l.squareFootage >= sfLow && l.squareFootage <= sfHigh;
    // Include if it's a comp-flagged lease in a matching market, or matches on 2+ criteria
    if (l.comp && (marketMatch || typeMatch)) return true;
    const score = (marketMatch ? 1 : 0) + (typeMatch ? 1 : 0) + (sizeMatch ? 1 : 0);
    return score >= 2;
  });
}

function ClosedDealCard({
  opp,
  comps,
}: {
  opp: Opportunity;
  comps: Lease[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card>
      <CardHeader className="border-b cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <div>
              <CardTitle>
                <Link
                  href={`/companies/${opp.companyId}`}
                  className="text-cw-green hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {opp.company}
                </Link>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {opp.contact} &middot; Target: {opp.targetMoveDate}
              </p>
              {(opp.teamMembers ?? []).length > 0 && (
                <div className="flex gap-1 mt-1">
                  {opp.teamMembers.map((m) => (
                    <span key={m} className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0 text-[10px] text-indigo-400">
                      {m.split(" ")[0]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Size</p>
              <p className="text-sm font-medium">{formatSF(opp.squareFootage)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Commission</p>
              <p className="text-sm font-semibold text-green-400">
                {formatCurrency(opp.estimatedCommission)}
              </p>
            </div>
            <Badge variant="secondary" className="ml-2">
              {comps.length} comp{comps.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        {opp.notes && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {opp.notes}
          </p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-4">
          {comps.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No comparable leases found for this deal.
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <ScrollableTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Submarket</TableHead>
                    <TableHead>Asset Type</TableHead>
                    <TableHead className="text-right">Square Footage</TableHead>
                    <TableHead>Agreement</TableHead>
                    <TableHead>Lease Expiration</TableHead>
                    <TableHead>Tenant Brokerage</TableHead>
                    <TableHead className="text-center">Comp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comps.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">
                        <Link
                          href={`/companies/${l.companyId}`}
                          className="text-cw-green hover:underline font-medium"
                        >
                          {l.company}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Link
                          href={`/buildings/${l.buildingId}`}
                          className="text-cw-green hover:underline"
                        >
                          {l.address}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.submarket}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.assetType}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {l.squareFootage.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.agreement}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.leaseExpiration}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.tenantBrokerage.join(", ")}
                      </TableCell>
                      <TableCell className="text-center">
                        {l.comp ? (
                          <Badge variant="default" className="text-[10px] bg-green-500/20 text-green-300 border-green-500/30">
                            Comp
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </ScrollableTable>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function CompsPage() {
  const { opportunities, leases } = useData();

  const closedWon = useMemo(
    () => opportunities.filter((o) => o.stage === "Closed Won"),
    [opportunities]
  );

  const compsMap = useMemo(() => {
    const map = new Map<string, Lease[]>();
    for (const opp of closedWon) {
      map.set(opp.id, findComps(opp, leases));
    }
    return map;
  }, [closedWon, leases]);

  const totalComps = useMemo(
    () => new Set(Array.from(compsMap.values()).flat().map((l) => l.id)).size,
    [compsMap]
  );

  const totalClosedValue = closedWon.reduce(
    (sum, o) => sum + o.estimatedCommission,
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Comps</h1>
          <span className="text-xs text-muted-foreground">
            Comparable transactions for closed deals
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15">
            <Trophy size={16} className="text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Closed Won</p>
            <p className="text-sm font-semibold text-foreground">
              {closedWon.length} deal{closedWon.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(totalClosedValue)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
            <Building2 size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comparable Leases</p>
            <p className="text-sm font-semibold text-foreground">{totalComps}</p>
          </div>
        </div>
      </div>

      {/* Closed deal cards with comps */}
      {closedWon.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No closed deals yet. Move an opportunity to &quot;Closed Won&quot; to see
              comparable transactions here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {closedWon.map((opp) => (
            <ClosedDealCard
              key={opp.id}
              opp={opp}
              comps={compsMap.get(opp.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
