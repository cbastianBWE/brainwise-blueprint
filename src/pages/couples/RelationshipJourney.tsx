import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Lock, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BrandedPlaceholder,
  minuteRange,
  renderImg,
  type CatalogueActivity,
  type ModuleRow,
} from "./journey/journeyShared";
import ModuleBriefingDialog from "./journey/ModuleBriefingDialog";
import ActivityBriefingDialog from "./journey/ActivityBriefingDialog";
import { JourneyMap } from "./JourneyMap";


interface JourneyRow {
  activity_id: string;
  code: string;
  title: string;
  module_number: number;
  sequence: number;
  est_minutes_low: number | null;
  est_minutes_high: number | null;
  allowed: boolean;
  reason: string | null;
  own_status: string | null;
  partner_status: string | null;
  reveal_pending: boolean | null;
}

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
};

interface SearchResult {
  activity_id: string;
  code: string;
  title: string;
  module_number: number;
  description: string | null;
  hero_image_url: string | null;
  tags: string[] | null;
  similarity: number;
}



export default function RelationshipJourney() {
  const { relationshipId } = useParams<{ relationshipId: string }>();
  const navigate = useNavigate();
  const [rows, setRows] = useState<JourneyRow[] | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueActivity[]>([]);
  const [otherName, setOtherName] = useState<string>("Your partner");
  const [error, setError] = useState<string | null>(null);
  const [openModule, setOpenModule] = useState<number | null>(null);
  const [openActivity, setOpenActivity] = useState<string | null>(null);
  // Session-only view preference. Never persisted to the database.
  const [view, setView] = useState<"map" | "browse">("map");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Debounced semantic search via edge function. No client-side fallback:
  // a silent downgrade to substring matching reads as a broken search.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSubmittedQuery("");
      setSearchResults(null);
      setSearching(false);
      return;
    }
    const t = setTimeout(() => setSubmittedQuery(q), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const q = submittedQuery.trim();
    if (!q) return;
    let cancelled = false;
    setSearching(true);
    (async () => {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "relationship-activity-search",
        { body: { query: q } },
      );
      if (cancelled) return;
      if (fnErr || !data?.success) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearchResults((data.results || []) as SearchResult[]);
      setSearching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [submittedQuery]);

  useEffect(() => {
    if (!relationshipId) return;
    let cancelled = false;
    (async () => {
      const [state, names, mods, acts] = await Promise.all([
        supabase.rpc("relationship_journey_state", { p_relationship: relationshipId }),
        supabase.rpc("relationship_first_names", { p_relationship: relationshipId }),
        (supabase as any)
          .from("relationship_modules")
          .select(
            "module_number,title,description,learning_outcomes,tags,prerequisites,hero_image_url",
          )
          .eq("active", true)
          .order("module_number"),
        (supabase as any)
          .from("relationship_activities")
          .select(
            "id,code,title,module_number,sequence,tags,hero_image_url,definition,est_minutes_low,est_minutes_high",
          )
          .eq("status", "published"),
      ]);
      if (cancelled) return;
      if (state.error) {
        setError(state.error.message);
        setRows([]);
        return;
      }
      setRows(
        ((state.data as JourneyRow[]) || [])
          .slice()
          .sort((a, b) => a.module_number - b.module_number || a.sequence - b.sequence),
      );
      const n = (names.data as any[])?.[0];
      if (n?.other_first_name) setOtherName(n.other_first_name);
      // Catalogue reads are enrichment only — a failure degrades the page,
      // it must never blank it.
      if (!mods.error && Array.isArray(mods.data)) setModules(mods.data as ModuleRow[]);
      if (!acts.error && Array.isArray(acts.data))
        setCatalogue(acts.data as CatalogueActivity[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [relationshipId]);

  const catalogueByCode = useMemo(() => {
    const m = new Map<string, CatalogueActivity>();
    for (const a of catalogue) m.set(a.code, a);
    return m;
  }, [catalogue]);

  const moduleByNumber = useMemo(() => {
    const m = new Map<number, ModuleRow>();
    for (const r of modules) m.set(r.module_number, r);
    return m;
  }, [modules]);

  if (!rows) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const moduleNumbers = Array.from(new Set(rows.map((r) => r.module_number)));
  const go = (code: string) => navigate(`/couples/${relationshipId}/activity/${code}`);

  const openActivityRow = rows.find((r) => r.code === openActivity) || null;
  const openModuleRows = openModule != null ? rows.filter((r) => r.module_number === openModule) : [];

  const searchRows = (searchResults || []).map((res) => ({
    res,
    row: rows.find((r) => r.code === res.code) || null,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Your journey</h1>
        <p className="text-sm text-muted-foreground">
          Work through it at your own pace. Some steps open once you have both finished the one before.
        </p>
      </header>

      <div className="flex justify-end">
        <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
          <Button
            type="button"
            size="sm"
            variant={view === "map" ? "default" : "ghost"}
            className="h-8"
            onClick={() => setView("map")}
          >
            Map
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "browse" ? "default" : "ghost"}
            className="h-8"
            onClick={() => setView("browse")}
          >
            Browse all
          </Button>
        </div>
      </div>

      {view === "map" && relationshipId && <JourneyMap relationshipId={relationshipId} />}

      {view === "browse" && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activities"
            className="pl-9"
          />
        </div>
      )}

      {view === "browse" && submittedQuery && (
        searching ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        ) : searchRows.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Results for "{submittedQuery}"
            </h2>
            <div className="space-y-2">
              {searchRows.map(({ res, row }) => {
                const modTitle = moduleByNumber.get(res.module_number)?.title;
                const locked = row ? !row.allowed : false;
                return (
                  <button
                    key={res.activity_id}
                    type="button"
                    onClick={() => setOpenActivity(res.code)}
                    className={
                      "block w-full text-left transition-opacity hover:opacity-90 " +
                      (locked ? "opacity-60" : "")
                    }
                  >
                    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Milestone {res.module_number + 1}
                        {modTitle ? ` · ${modTitle}` : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-sm font-medium">{res.title}</span>
                        {row && (
                          <Badge variant="secondary">
                            {STATUS_LABEL[row.own_status || "not_started"] || row.own_status}
                          </Badge>
                        )}
                      </div>
                      {res.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {res.description}
                        </p>
                      )}
                      {locked && row?.reason && (
                        <p className="text-xs text-muted-foreground">{row.reason}</p>
                      )}
                      {res.tags && res.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {res.tags.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <Card>
            <CardContent className="p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No matching activities</p>
            </CardContent>
          </Card>
        )
      )}

      {view === "browse" && !submittedQuery && moduleNumbers.map((m, mi) => {

        const mod = moduleByNumber.get(m) || null;
        const modRows = rows.filter((r) => r.module_number === m);
        const mins = minuteRange(modRows);
        const hero = mod?.hero_image_url || null;
        // Display ordinal, 1-based. module_number stays zero-based.
        const position = mi + 1;

        return (
          <Card key={m} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenModule(m)}
              className="block w-full text-left transition-opacity hover:opacity-90"
            >
              <div className="aspect-video w-full overflow-hidden bg-muted">
                {hero ? (
                  <img
                    src={renderImg(hero, 480, 270)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <BrandedPlaceholder />
                )}
              </div>
              <CardHeader className="pb-3">
                <p className="text-xs text-muted-foreground">Milestone {position}</p>
                <CardTitle className="text-base">
                  {mod?.title || `Milestone ${position}`}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {modRows.length} {modRows.length === 1 ? "activity" : "activities"}
                  {mins ? ` · ${mins.low} to ${mins.high} min` : ""}
                </p>
              </CardHeader>
            </button>
            <CardContent className="space-y-2">
              {modRows.map((r) => {
                const est =
                  r.est_minutes_low && r.est_minutes_high
                    ? `${r.est_minutes_low}–${r.est_minutes_high} min`
                    : r.est_minutes_low
                      ? `${r.est_minutes_low} min`
                      : null;
                return (
                  <button
                    key={r.activity_id}
                    type="button"
                    onClick={() => setOpenActivity(r.code)}
                    className={
                      "block w-full text-left transition-opacity hover:opacity-90 " +
                      (r.allowed ? "" : "opacity-60")
                    }
                  >
                    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {!r.allowed && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-sm font-medium">{r.title}</span>
                        {r.reveal_pending && (
                          <Badge variant="default" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            Something to see
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {STATUS_LABEL[r.own_status || "not_started"] || r.own_status}
                        </Badge>
                        {est && <span className="text-xs text-muted-foreground">{est}</span>}
                      </div>
                      {!r.allowed && r.reason && (
                        <p className="text-xs text-muted-foreground">{r.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {otherName}:{" "}
                        {STATUS_LABEL[r.partner_status || "not_started"]?.toLowerCase() ||
                          r.partner_status}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <ModuleBriefingDialog
        open={openModule != null}
        onOpenChange={(v) => !v && setOpenModule(null)}
        moduleNumber={openModule != null ? moduleNumbers.indexOf(openModule) + 1 : 1}
        totalModules={moduleNumbers.length}
        module={openModule != null ? moduleByNumber.get(openModule) || null : null}
        activityCount={openModuleRows.length}
        minutes={minuteRange(openModuleRows)}
        startCode={openModuleRows.find((r) => r.allowed)?.code ?? null}
        blockedReason={openModuleRows.find((r) => !r.allowed && r.reason)?.reason ?? null}
        onStart={(code) => {
          setOpenModule(null);
          go(code);
        }}
      />

      <ActivityBriefingDialog
        open={openActivity != null}
        onOpenChange={(v) => !v && setOpenActivity(null)}
        state={openActivityRow}
        catalogue={openActivity ? catalogueByCode.get(openActivity) || null : null}
        moduleTitle={
          openActivityRow ? moduleByNumber.get(openActivityRow.module_number)?.title ?? null : null
        }
        otherName={otherName}
        onGo={(code) => {
          setOpenActivity(null);
          go(code);
        }}
      />
    </div>
  );
}
