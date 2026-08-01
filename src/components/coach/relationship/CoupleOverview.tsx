import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOverview, statusClasses, STATUS_LABEL, type OverviewRow, type RosterRow,
} from "./couplesShared";
import CoupleGatingControl from "./CoupleGatingControl";

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs ${statusClasses(status)}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/**
 * Surface 2 — one couple's progress. Progress only; there is deliberately no
 * affordance anywhere here to open an answer.
 */
export default function CoupleOverview({
  couple,
  onBack,
  onChanged,
}: {
  couple: RosterRow;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<OverviewRow[] | null>(null);
  const [areaTitles, setAreaTitles] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setRows(await fetchOverview(couple.relationship_id));
  }, [couple.relationship_id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("relationship_focus_areas_state", {
        p_relationship: couple.relationship_id,
      });
      if (!Array.isArray(data)) return;
      const map: Record<string, string> = {};
      for (const a of data as unknown as Array<{ area_code: string; title: string }>) {
        map[a.area_code] = a.title;
      }
      setAreaTitles(map);
    })();
  }, [couple.relationship_id]);

  const groups = useMemo(() => {
    const m = new Map<string, OverviewRow[]>();
    for (const r of rows || []) {
      const key = r.area_code ?? "";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return Array.from(m.entries());
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All couples
          </Button>
          <h2 className="text-xl font-semibold">
            {couple.partner_one} &amp; {couple.partner_two}
          </h2>
          <p className="text-sm text-muted-foreground">
            Core progress {couple.one_done} / {couple.core_total} · {couple.two_done} / {couple.core_total}
            {couple.pacing_ceiling_module != null && ` · paced to Milestone ${couple.pacing_ceiling_module}`}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Journey progress</CardTitle>
          <CardDescription>
            Statuses only — answers stay between the couple and the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Nothing started yet.</p>
          ) : (
            <div className="space-y-6">
              {groups.map(([area, list]) => (
                <div key={area || "core"} className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {area ? areaTitles[area] || area : "Core journey"}
                  </p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity</TableHead>
                          <TableHead>{couple.partner_one}</TableHead>
                          <TableHead>{couple.partner_two}</TableHead>
                          <TableHead>Barrier</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((r) => (
                          <TableRow key={r.activity_id}>
                            <TableCell>
                              <span className="text-sm font-medium">{r.title}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                Milestone {r.module_number}
                              </span>
                            </TableCell>
                            <TableCell><StatusChip status={r.one_status} /></TableCell>
                            <TableCell><StatusChip status={r.two_status} /></TableCell>
                            <TableCell>
                              {r.barrier_cleared ? (
                                <Check className="h-4 w-4 text-primary" aria-label="Barrier cleared" />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CoupleGatingControl
        couple={couple}
        onChanged={() => {
          onChanged();
          void load();
        }}
      />
    </div>
  );
}
