import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, X } from "lucide-react";

type Mode = "work" | "personal" | "romantic";

interface SubjectRow {
  user_id: string;
  full_name: string | null;
  organization_id: string | null;
  last_completed_at: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedModes: Mode[];
  onGenerated: () => void;
}

async function readErrorCode(error: unknown): Promise<string | null> {
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string; missing?: unknown }> } })?.context;
    if (ctx?.json) {
      const body = await ctx.json();
      return body?.error ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

function mapErrorToToast(code: string | null) {
  switch (code) {
    case "min_team_size_6":
      return "A team needs at least 6 people.";
    case "subjects_without_completed_ptp":
      return "Some selected people have not completed a PTP yet.";
    case "forbidden_for_subject_set":
    case "forbidden_for_pair_or_mode":
      return "You are not allowed to generate this report for those people.";
    case "subjects_must_differ":
      return "Pick two different people.";
    default:
      return "Could not generate report. Please try again.";
  }
}

export default function GenerateReportDialog({ open, onOpenChange, allowedModes, onGenerated }: Props) {
  const navigate = useNavigate();
  const [kind, setKind] = useState<"team" | "paired">("team");
  const [mode, setMode] = useState<Mode>(allowedModes[0] ?? "work");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SubjectRow[]>([]);
  const [selected, setSelected] = useState<SubjectRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reportLabel, setReportLabel] = useState("");
  const debounceRef = useRef<number | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setKind("team");
      setMode(allowedModes[0] ?? "work");
      setQuery("");
      setResults([]);
      setSelected([]);
      setSubmitting(false);
      setReportLabel("");
    }
  }, [open, allowedModes]);

  // Search subjects (debounced)
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("bw_list_report_subjects", { p_search: query });
      if (error) {
        return;
      }
      setResults(((data as SubjectRow[]) ?? []));
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.user_id)), [selected]);

  const toggleSelect = (row: SubjectRow) => {
    setSelected((prev) => {
      const has = prev.find((p) => p.user_id === row.user_id);
      if (has) return prev.filter((p) => p.user_id !== row.user_id);
      if (kind === "paired" && prev.length >= 2) return prev;
      return [...prev, row];
    });
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setSelected((prev) => {
      const copy = [...prev];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy;
    });
  };
  const moveDown = (idx: number) => {
    setSelected((prev) => {
      if (idx >= prev.length - 1) return prev;
      const copy = [...prev];
      [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
      return copy;
    });
  };
  const remove = (id: string) => setSelected((prev) => prev.filter((p) => p.user_id !== id));

  const canGenerate =
    !submitting &&
    (kind === "team" ? selected.length >= 6 : selected.length === 2);

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const ids = selected.map((s) => s.user_id);
      if (kind === "team") {
        const { data, error } = await supabase.functions.invoke("generate-team-profile", {
          body: { subject_user_ids: ids },
        });
        if (error) {
          const code = await readErrorCode(error);
          toast.error(mapErrorToToast(code));
          setSubmitting(false);
          return;
        }
        const id = (data as { team_profile_id: string }).team_profile_id;
        onGenerated();
        onOpenChange(false);
        navigate(`/team-report/${id}`);
      } else {
        const { data, error } = await supabase.functions.invoke("generate-paired-profile", {
          body: { user_a: ids[0], user_b: ids[1], relationship_mode: mode },
        });
        if (error) {
          const code = await readErrorCode(error);
          toast.error(mapErrorToToast(code));
          setSubmitting(false);
          return;
        }
        const id = (data as { paired_profile_id: string }).paired_profile_id;
        onGenerated();
        onOpenChange(false);
        navigate(`/paired-report/${id}`);
      }
    } catch (e) {
      toast.error("Could not generate report. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate report</DialogTitle>
          <DialogDescription>
            Build a team or paired report from people you can read.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Report type */}
          <div className="space-y-2">
            <Label>Report type</Label>
            <RadioGroup
              value={kind}
              onValueChange={(v) => {
                setKind(v as "team" | "paired");
                setSelected([]);
              }}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="kind-team" value="team" />
                <Label htmlFor="kind-team" className="font-normal cursor-pointer">Team</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="kind-paired" value="paired" />
                <Label htmlFor="kind-paired" className="font-normal cursor-pointer">Paired</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mode (paired only) */}
          {kind === "paired" && (
            <div className="space-y-2">
              <Label>Relationship mode</Label>
              {allowedModes.length === 1 ? (
                <div>
                  <Badge variant="secondary" className="capitalize">{allowedModes[0]}</Badge>
                </div>
              ) : (
                <RadioGroup
                  value={mode}
                  onValueChange={(v) => setMode(v as Mode)}
                  className="flex gap-6"
                >
                  {allowedModes.map((m) => (
                    <div key={m} className="flex items-center gap-2">
                      <RadioGroupItem id={`mode-${m}`} value={m} />
                      <Label htmlFor={`mode-${m}`} className="font-normal capitalize cursor-pointer">{m}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          )}

          {/* Subjects */}
          <div className="space-y-2">
            <Label>Subjects</Label>
            <Input
              placeholder="Search people"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
              {results.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                  No people found.
                </div>
              ) : (
                results.map((row) => {
                  const checked = selectedIds.has(row.user_id);
                  const disabled = !checked && kind === "paired" && selected.length >= 2;
                  return (
                    <label
                      key={row.user_id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 ${
                        disabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() => toggleSelect(row)}
                      />
                      <span className="text-sm">{row.full_name ?? "Unnamed"}</span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Counter */}
            <div className="text-xs text-muted-foreground">
              {kind === "team"
                ? `${selected.length} of 6 minimum`
                : `${selected.length} of 2 selected`}
            </div>

            {/* Selected list */}
            {selected.length > 0 && (
              <div className="space-y-1 pt-2">
                {selected.map((row, idx) => (
                  <div
                    key={row.user_id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {kind === "paired" && (
                        <Badge variant="outline" className="shrink-0">
                          {idx === 0 ? "A" : "B"}
                        </Badge>
                      )}
                      <span className="truncate">{row.full_name ?? "Unnamed"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {kind === "paired" && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveDown(idx)}
                            disabled={idx === selected.length - 1}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => remove(row.user_id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate}>
            {submitting ? "Generating..." : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
