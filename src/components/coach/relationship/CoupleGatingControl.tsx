import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Lock, Unlock, Users } from "lucide-react";
import { firstRow, type OkReason, type RosterRow } from "./couplesShared";

interface GatedAreaRow {
  area_code: string;
  c_number: number;
  title: string;
  practitioner_gated: boolean;
  self_selectable: boolean;
  content_ready: boolean;
  selected: boolean;
}

/**
 * Surface 5 — gating + pacing for one couple, plus the (scaffold-only)
 * coach-led session entry point. Content-blind: nothing here reads answers.
 */
export default function CoupleGatingControl({
  couple,
  onChanged,
}: {
  couple: RosterRow;
  onChanged: () => void;
}) {
  const [areas, setAreas] = useState<GatedAreaRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pacing, setPacing] = useState<string>(
    couple.pacing_ceiling_module == null ? "none" : String(couple.pacing_ceiling_module),
  );
  const [savingPacing, setSavingPacing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("relationship_focus_areas_state", {
      p_relationship: couple.relationship_id,
    });
    if (error || !Array.isArray(data)) {
      setAreas([]);
      return;
    }
    setAreas(
      (data as unknown as GatedAreaRow[]).filter(
        (a) => a.practitioner_gated || a.self_selectable === false,
      ),
    );
  }, [couple.relationship_id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPacing(couple.pacing_ceiling_module == null ? "none" : String(couple.pacing_ceiling_module));
  }, [couple.pacing_ceiling_module]);

  const openArea = async (areaCode: string) => {
    setBusy(areaCode);
    const { data, error } = await supabase.rpc("relationship_coach_open_area", {
      p_relationship: couple.relationship_id,
      p_area_code: areaCode,
    });
    const res = firstRow<{ ok: boolean; reason: string }>(data) as OkReason;
    if (error || !res?.ok) {
      toast.error(res?.reason ? `Couldn't open that area: ${res.reason}` : "Couldn't open that area.");
    } else {
      toast.success("Area opened for this couple.");
      await load();
      onChanged();
    }
    setBusy(null);
  };

  const savePacing = async (value: string) => {
    setPacing(value);
    setSavingPacing(true);
    const { data, error } = await supabase.rpc("relationship_coach_set_pacing", {
      p_relationship: couple.relationship_id,
      p_module: value === "none" ? (null as unknown as number) : Number(value),
    });
    const res = firstRow<{ ok: boolean; reason: string }>(data) as OkReason;
    if (error || !res?.ok) {
      toast.error(res?.reason ? `Couldn't set pacing: ${res.reason}` : "Couldn't set pacing.");
    } else {
      toast.success(value === "none" ? "Pacing cleared." : `Paced to Milestone ${value}.`);
      onChanged();
    }
    setSavingPacing(false);
  };

  const hasOpenGatedArea = (areas || []).some((a) => a.selected);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Practitioner-gated areas</CardTitle>
          <CardDescription>
            These areas only open when you decide the couple is ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {areas === null ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gated areas in the catalogue yet.</p>
          ) : (
            areas.map((a) => (
              <div
                key={a.area_code}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {a.selected ? (
                      <Unlock className="h-4 w-4 text-primary" aria-hidden="true" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    {a.title}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">{a.area_code}</Badge>
                    {a.selected && <Badge className="text-xs">Open</Badge>}
                    {!a.content_ready && (
                      <Badge variant="outline" className="text-xs">Content in progress</Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={a.selected ? "outline" : "default"}
                  disabled={a.selected || busy === a.area_code}
                  onClick={() => openArea(a.area_code)}
                >
                  {busy === a.area_code ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : a.selected ? (
                    "Opened"
                  ) : (
                    "Open for this couple"
                  )}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pacing</CardTitle>
            <CardDescription>
              Cap how far this couple can run. They may work up to and including the chosen milestone.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Select value={pacing} onValueChange={savePacing} disabled={savingPacing}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="No cap" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No cap</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    Milestone {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {savingPacing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden="true" /> Coach-led session
            </CardTitle>
            <CardDescription>
              Facilitator-mode sessions run inside the gated areas you open.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" disabled>
              {hasOpenGatedArea ? "Coming with C5 / C12" : "Open a gated area first"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
