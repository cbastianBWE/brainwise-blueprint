import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, ClipboardCheck, Calendar, CreditCard, GitBranch, Brain, Award,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalCompleted: number;
  completedThisMonth: number;
  tierCounts: Record<string, number>;
  activePlatformVersion: string;
  activeAiVersion: string;
  certificationCounts: Record<string, { in_progress: number; certified: number }>;
}

export default function PlatformHealth() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [usersRes, completedRes, monthRes, tiersRes, pvRes, aiRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("assessments").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("assessments").select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("completed_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from("users").select("subscription_tier").eq("subscription_status", "active"),
        supabase.from("platform_versions").select("version_string").eq("is_active", true).limit(1).single(),
        supabase.from("ai_versions").select("version_string").eq("is_active", true).limit(1).single(),
      ]);

      const tierCounts: Record<string, number> = {};
      if (tiersRes.data) {
        for (const row of tiersRes.data) {
          const t = row.subscription_tier || "base";
          tierCounts[t] = (tierCounts[t] || 0) + 1;
        }
      }

      setStats({
        totalUsers: usersRes.count || 0,
        totalCompleted: completedRes.count || 0,
        completedThisMonth: monthRes.count || 0,
        tierCounts,
        activePlatformVersion: pvRes.data?.version_string || "None",
        activeAiVersion: aiRes.data?.version_string || "None",
      });
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

  if (!stats) return null;

  const cards = [
    { icon: Users, label: "Total Registered Users", value: stats.totalUsers },
    { icon: ClipboardCheck, label: "Total Completed Assessments", value: stats.totalCompleted },
    { icon: Calendar, label: "Completed This Month", value: stats.completedThisMonth },
  ];

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Health</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of platform-wide metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="rounded-lg bg-primary/10 p-2"><c.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(stats.tierCounts).length > 0 ? (
          Object.entries(stats.tierCounts).map(([tier, count]) => (
            <Card key={tier}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="rounded-lg bg-accent/10 p-2"><CreditCard className="h-5 w-5 text-accent" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{tier} Tier Active</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">No active subscriptions</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2"><GitBranch className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.activePlatformVersion}</p>
              <p className="text-xs text-muted-foreground">Active Platform Version</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2"><Brain className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.activeAiVersion}</p>
              <p className="text-xs text-muted-foreground">Active AI Version</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
