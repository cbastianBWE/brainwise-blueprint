import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GitBranch, Brain } from "lucide-react";
import { format } from "date-fns";

interface VersionRow {
  id: string;
  version_string: string;
  is_active: boolean;
  is_deprecated?: boolean;
  activated_at: string | null;
  type: "platform" | "ai";
}

export default function VersionManagement() {
  const [activeP, setActiveP] = useState<string>("None");
  const [activeAi, setActiveAi] = useState<string>("None");
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [pvRes, aiRes] = await Promise.all([
        supabase.from("platform_versions").select("id, version_string, is_active, is_deprecated, activated_at").order("created_at", { ascending: false }),
        supabase.from("ai_versions").select("id, version_string, is_active, activated_at").order("created_at", { ascending: false }),
      ]);

      const pvRows: VersionRow[] = (pvRes.data || []).map(r => ({ ...r, type: "platform" as const }));
      const aiRows: VersionRow[] = (aiRes.data || []).map(r => ({ ...r, type: "ai" as const }));

      const activePv = pvRows.find(r => r.is_active);
      const activeAiV = aiRows.find(r => r.is_active);
      setActiveP(activePv?.version_string || "None");
      setActiveAi(activeAiV?.version_string || "None");
      setVersions([...pvRows, ...aiRows]);
      setLoading(false);
    };
    load();
  }, []);

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
