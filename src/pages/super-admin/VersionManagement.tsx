import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminSession } from "@/hooks/useSuperAdminSession";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GitBranch, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface VersionRow {
  id: string;
  version_string: string;
  is_active: boolean;
  is_deprecated?: boolean;
  activated_at: string | null;
  type: "platform" | "ai";
}

export default function VersionManagement() {
  const { user } = useAuth();
  const { sessionId } = useSuperAdminSession();
  const { toast } = useToast();
  const [activeP, setActiveP] = useState<string>("None");
  const [activeAi, setActiveAi] = useState<string>("None");
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Batch regenerate state
  const [totalResults, setTotalResults] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [pvRes, aiRes, countRes] = await Promise.all([
        supabase.from("platform_versions").select("id, version_string, is_active, is_deprecated, activated_at").order("created_at", { ascending: false }),
        supabase.from("ai_versions").select("id, version_string, is_active, activated_at").order("created_at", { ascending: false }),
        supabase.from("assessment_results").select("id", { count: "exact", head: true }).not("ai_narrative", "is", null),
      ]);

      const pvRows: VersionRow[] = (pvRes.data || []).map(r => ({ ...r, type: "platform" as const }));
      const aiRows: VersionRow[] = (aiRes.data || []).map(r => ({ ...r, type: "ai" as const }));

      const activePv = pvRows.find(r => r.is_active);
      const activeAiV = aiRows.find(r => r.is_active);
      setActiveP(activePv?.version_string || "None");
      setActiveAi(activeAiV?.version_string || "None");
      setVersions([...pvRows, ...aiRows]);
      setTotalResults(countRes.count ?? 0);
      setLoading(false);
    };
    load();
  }, []);

  const handleBatchRegenerate = useCallback(async () => {
    setBatchRunning(true);
    setBatchProgress(0);

    // Fetch all assessment_result IDs with existing narratives
    const { data: results, error } = await supabase
      .from("assessment_results")
      .select("id")
      .not("ai_narrative", "is", null);

    if (error || !results?.length) {
      toast({ title: "Error", description: "Failed to fetch assessment results.", variant: "destructive" });
      setBatchRunning(false);
      return;
    }

    const total = results.length;
    setBatchTotal(total);
    let completed = 0;

    // Process in batches of 10
    for (let i = 0; i < total; i += 10) {
      const batch = results.slice(i, i + 10);
      await Promise.all(
        batch.map((r) =>
          supabase.functions.invoke("generate-report", {
            body: { assessment_result_id: r.id },
          })
        )
      );
      completed += batch.length;
      setBatchProgress(completed);

      // Delay between batches (except last)
      if (i + 10 < total) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Log to audit
    if (user && sessionId) {
      await supabase.functions.invoke("log-audit", {
        body: {
          action_type: "aggregate_export_generated",
          session_id: sessionId,
          detail: { count: total, ai_version: activeAi },
        },
      });
    }

    toast({ title: "Batch Complete", description: `Regenerated ${total} assessment reports.` });
    setBatchRunning(false);
  }, [activeAi, user, sessionId, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const getStatus = (row: VersionRow) => {
    if (row.is_active) return <Badge className="bg-accent text-accent-foreground">Active</Badge>;
    if (row.is_deprecated) return <Badge variant="destructive">Deprecated</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  const estimatedCost = (totalResults * 0.02).toFixed(2);

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Version Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Current versions and history (read-only)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2"><GitBranch className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-lg font-semibold text-foreground">{activeP}</p>
              <p className="text-xs text-muted-foreground">Active Platform Version</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2"><Brain className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-lg font-semibold text-foreground">{activeAi}</p>
              <p className="text-xs text-muted-foreground">Active AI Version</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Regenerate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Batch Regenerate Reports</CardTitle>
          <CardDescription>
            Regenerate AI narratives for all completed assessments using the active AI version ({activeAi}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {batchRunning ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Regenerating {batchProgress} of {batchTotal} assessments…
              </div>
              <Progress value={batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0} />
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={totalResults === 0}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Batch Regenerate All Reports ({totalResults})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Batch Regenerate Reports?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      This will regenerate AI narratives for all completed assessments using the current active AI version. This uses Anthropic API credits — approximately $0.02 per assessment.
                    </span>
                    <span className="block font-medium text-foreground">
                      Total assessments: {totalResults}. Estimated cost: ${estimatedCost}.
                    </span>
                    <span className="block">Continue?</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBatchRegenerate}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Version History</CardTitle>
          <CardDescription>All platform and AI versions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map(v => (
                  <TableRow key={v.type + v.id}>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{v.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{v.version_string}</TableCell>
                    <TableCell className="text-sm">
                      {v.activated_at ? format(new Date(v.activated_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>{getStatus(v)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
