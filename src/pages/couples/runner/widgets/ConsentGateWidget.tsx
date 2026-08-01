import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CoupleStep } from "../coupleShared";

/**
 * Per-item consent for the private-year work (C18.6).
 *
 * Only the partner who did the private single-partner activities (the owner)
 * ever sees this. Everything defaults to "Keep it mine" — nothing crosses
 * unless the owner opts it in, one item at a time. The other partner is never
 * shown the selector, the items, or the fact that any of it exists.
 */

export interface ConsentValue {
  /** source item key -> shared? Absent means "mine". */
  items?: Record<string, boolean>;
  /** Set once the owner has been resolved, so the runner can trust the shape. */
  owner?: boolean;
}

const ITEM_SOURCES: Record<string, { code: string; key: string; label: string; blurb: string }> = {
  own_load: {
    code: "mr-c18-1-holding-all-of-it",
    key: "own_load_map",
    label: "What you were carrying",
    blurb: "The load you mapped while they were inside.",
  },
  contact_plan: {
    code: "mr-c18-2-through-a-window",
    key: "own_contact_plan",
    label: "How you kept contact going",
    blurb: "The visits, the calls, the letters — and what it took.",
  },
  children_account: {
    code: "mr-c18-3-what-children-told",
    key: "own_children_account",
    label: "What the children were told",
    blurb: "The account you gave them, and how you held it.",
  },
  own_cost: {
    code: "mr-c18-4-what-i-gave-up",
    key: "own_cost",
    label: "What it cost you",
    blurb: "What you gave up in those years.",
  },
};

/** The consented item keys, for anything downstream that must receive only these. */
export function consentedItems(value: unknown): string[] {
  const v = (value || {}) as ConsentValue;
  return Object.entries(v.items || {})
    .filter(([, on]) => on === true)
    .map(([k]) => k);
}

export function ConsentGateWidget({
  step,
  value,
  onChange,
  relationshipId,
  readOnly,
}: {
  step: CoupleStep;
  value: unknown;
  onChange: (next: ConsentValue) => void;
  relationshipId?: string;
  readOnly?: boolean;
}) {
  const gate = (step as any).consentGate as
    | { owner?: string; source?: string[]; default?: string; granularity?: string }
    | undefined;
  const v = (value || {}) as ConsentValue;
  const [available, setAvailable] = useState<string[] | null>(null);

  const sources = (gate?.source || []).filter((s) => s in ITEM_SOURCES);

  // Ownership is proved by having the private material, not by a role guess.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!relationshipId || sources.length === 0) {
        setAvailable([]);
        return;
      }
      const codes = [...new Set(sources.map((s) => ITEM_SOURCES[s].code))];
      const [{ data: auth }, { data: ids }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("relationship_activity_ids", { p_codes: codes }),
      ]);
      const selfId = auth?.user?.id;
      if (!selfId) {
        if (!cancelled) setAvailable([]);
        return;
      }
      const idByCode = new Map(
        ((ids as Array<{ code: string; id: string }> | null) || []).map((r) => [r.code, r.id]),
      );
      const found: string[] = [];
      for (const s of sources) {
        const src = ITEM_SOURCES[s];
        const activityId = idByCode.get(src.code);
        if (!activityId) continue;
        const { data, error } = await supabase.rpc("relationship_cross_read_own", {
          p_relationship: relationshipId,
          p_activity: activityId,
          p_run: 1,
          p_user: selfId,
        });
        if (cancelled) return;
        const own = error ? null : ((data as Record<string, unknown>) ?? null);
        if (own && own[src.key] != null) found.push(s);
      }
      if (!cancelled) setAvailable(found);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationshipId, JSON.stringify(sources)]);

  // Record ownership once, so the joint session knows whose choices these are.
  useEffect(() => {
    if (readOnly || !available || available.length === 0 || v.owner === true) return;
    onChange({ ...v, owner: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  if (available === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        One moment.
      </div>
    );
  }

  // Not the owner: no selector, no list, no hint that any of it exists.
  if (available.length === 0) return null;

  const set = (key: string, share: boolean) =>
    onChange({ ...v, owner: true, items: { ...(v.items || {}), [key]: share } });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        You decide, one by one. Everything here stays yours unless you say otherwise, and nothing you
        keep is ever mentioned.
      </p>

      {available.map((s) => {
        const src = ITEM_SOURCES[s];
        const shared = v.items?.[s] === true;
        return (
          <Card key={s}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-[12rem] flex-1">
                <p className="text-sm font-medium">{src.label}</p>
                <p className="text-xs text-muted-foreground">{src.blurb}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={shared ? "default" : "outline"}
                  disabled={readOnly}
                  onClick={() => set(s, true)}
                >
                  Bring into the conversation
                </Button>
                <Button
                  size="sm"
                  variant={!shared ? "secondary" : "ghost"}
                  disabled={readOnly}
                  onClick={() => set(s, false)}
                >
                  Keep it mine
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
