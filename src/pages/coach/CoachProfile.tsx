import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";

interface AcceptanceRow {
  id: string;
  accepted_at: string;
  version_id: string;
  coach_disclosure_versions: {
    version_hash: string;
    effective_from: string;
    body_markdown: string;
  } | null;
}

export default function CoachProfile() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: acceptances, isLoading } = useQuery({
    queryKey: ["coach-disclosure-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_disclosure_acceptances")
        .select(`
          id, accepted_at, version_id,
          coach_disclosure_versions!inner (
            version_hash, effective_from, body_markdown
          )
        `)
        .eq("coach_user_id", user!.id)
        .order("accepted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AcceptanceRow[];
    },
  });

  const mostRecent = acceptances?.[0];

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Confidentiality Obligations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Your acceptance history</h3>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : mostRecent ? (
              <p className="text-sm text-muted-foreground">
                You are currently bound by the most recent version, accepted on{" "}
                <span className="text-foreground font-medium">{fmt(mostRecent.accepted_at)}</span>.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You have not yet accepted a coach confidentiality disclosure.
              </p>
            )}
          </div>

          {acceptances && acceptances.length > 0 && (
            <div className="space-y-2">
              {acceptances.map((row) => {
                const isOpen = !!expanded[row.id];
                const v = row.coach_disclosure_versions;
                return (
                  <div key={row.id} className="rounded-md border">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40"
                      onClick={() => setExpanded((p) => ({ ...p, [row.id]: !isOpen }))}
                    >
                      <div className="text-sm">
                        <div className="font-medium text-foreground">
                          Accepted {fmt(row.accepted_at)}
                        </div>
                        {v && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Version effective {fmt(v.effective_from)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        {isOpen ? "Hide text" : "View text"}
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </button>
                    {isOpen && v && (
                      <div className="px-4 py-4 border-t bg-muted/20">
                        <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground">
                          <ReactMarkdown>{v.body_markdown}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
