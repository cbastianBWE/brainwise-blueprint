import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared prefill resolver for couples steps.
 *
 * `prefilledFrom` shape: { <targetKey>: { from: <activityCode>, key: <responseKey>, subkey?: "dot.path" } }
 *
 * Rules that never bend:
 * - own data only (never a partner's),
 * - only fills a field that is currently empty,
 * - the value stays editable, and the "prefilled" note only shows where a value landed.
 */
export type PrefillSpec = { from: string; key: string; subkey?: string };

type Rec = Record<string, unknown>;

export type PrefillSeed = { text: string; items: string[] };

/** Walk a dot path, tolerating missing links. */
function walk(val: unknown, path?: string): unknown {
  if (!path) return val;
  let cur = val;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Rec)[part];
  }
  return cur;
}

/** Turn an earlier answer (selection, list, text, media transcript) into a list of readable items. */
export function seedItems(val: unknown): string[] {
  if (val == null) return [];
  if (typeof val === "string") return val.trim() ? [val.trim()] : [];
  if (Array.isArray(val)) {
    return val
      .map((x) =>
        typeof x === "string" ? x : String((x as Rec)?.label ?? (x as Rec)?.text ?? (x as Rec)?.transcript ?? ""),
      )
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (typeof val === "object") {
    const o = val as Rec;
    if (Array.isArray(o.selected)) return seedItems(o.selected);
    if (Array.isArray(o.items)) return seedItems(o.items);
    if (typeof o.transcript === "string") return seedItems(o.transcript);
    if (typeof o.text === "string") return seedItems(o.text);
  }
  return [];
}

export function toSeed(val: unknown): PrefillSeed {
  const items = seedItems(val);
  return { items, text: items.join("\n") };
}

export function usePrefill({
  prefilledFrom,
  relationshipId,
  activityCode,
  runNumber,
  responses,
  disabled,
  isEmptyTarget,
  apply,
}: {
  prefilledFrom?: Record<string, string | PrefillSpec> | undefined;
  relationshipId?: string;
  /** The code of the activity currently being run — enables same-activity sources. */
  activityCode?: string;
  runNumber?: number;
  /** The current session's saved answers, keyed by step key. Used for same-activity sources. */
  responses?: Record<string, unknown>;
  disabled?: boolean;
  isEmptyTarget: (target: string) => boolean;
  apply: (seeds: Record<string, PrefillSeed>) => void;
}): Record<string, boolean> {
  const [prefilled, setPrefilled] = useState<Record<string, boolean>>({});
  const ran = useRef(false);
  const isEmptyRef = useRef(isEmptyTarget);
  isEmptyRef.current = isEmptyTarget;
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const responsesRef = useRef(responses);
  responsesRef.current = responses;

  useEffect(() => {
    if (disabled || ran.current) return;
    const map = prefilledFrom;
    if (!map || Object.keys(map).length === 0) return;

    const specs = Object.entries(map)
      .map(([target, spec]) =>
        spec && typeof spec === "object" && spec.from && spec.key
          ? { target, from: spec.from, key: spec.key, subkey: spec.subkey }
          : null,
      )
      .filter((s) => !!s)
      .map((s) => s as { target: string } & PrefillSpec)
      .filter((s) => isEmptyRef.current(s.target));
    if (specs.length === 0) return;

    const local = specs.filter((s) => activityCode && s.from === activityCode);
    const remote = specs.filter((s) => !activityCode || s.from !== activityCode);

    // Same-activity sources resolve straight off the in-memory answers.
    const seeds: Record<string, PrefillSeed> = {};
    for (const s of local) {
      const seed = toSeed(walk((responsesRef.current || {})[s.key], s.subkey));
      if (seed.items.length > 0) seeds[s.target] = seed;
    }

    if (remote.length === 0) {
      if (Object.keys(seeds).length === 0) return;
      ran.current = true;
      applyRef.current(seeds);
      setPrefilled(Object.fromEntries(Object.keys(seeds).map((k) => [k, true])));
      return;
    }

    if (!relationshipId) return;
    ran.current = true;

    let cancelled = false;
    (async () => {
      const [{ data: auth }, { data: ids }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("relationship_activity_ids", { p_codes: [...new Set(remote.map((s) => s.from))] }),
      ]);
      const selfId = auth?.user?.id;
      if (!selfId || cancelled) return;
      const idByCode = new Map(
        ((ids as Array<{ code: string; id: string }> | null) || []).map((r) => [r.code, r.id]),
      );

      const cache = new Map<string, Rec | null>();
      for (const s of remote) {
        const activityId = idByCode.get(s.from);
        if (!activityId) continue;
        if (!cache.has(activityId)) {
          const { data, error } = await supabase.rpc("relationship_cross_read_own", {
            p_relationship: relationshipId,
            p_activity: activityId,
            p_run: runNumber ?? 1,
            p_user: selfId,
          });
          cache.set(activityId, error ? null : ((data as Rec) ?? null));
        }
        if (cancelled) return;
        const source = cache.get(activityId);
        if (!source) continue;
        const seed = toSeed(walk(source[s.key], s.subkey));
        if (seed.items.length > 0) seeds[s.target] = seed;
      }

      if (cancelled || Object.keys(seeds).length === 0) return;
      const landed: Record<string, boolean> = {};
      const kept: Record<string, PrefillSeed> = {};
      for (const [target, seed] of Object.entries(seeds)) {
        if (!isEmptyRef.current(target)) continue;
        kept[target] = seed;
        landed[target] = true;
      }
      if (Object.keys(kept).length === 0) return;
      applyRef.current(kept);
      setPrefilled(landed);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledFrom, relationshipId, activityCode, runNumber, disabled]);

  return prefilled;
}
