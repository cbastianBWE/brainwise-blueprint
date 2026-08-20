import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LearningReport from "@/pages/super-admin/LearningReport";
import ResourceEngagementReport from "@/pages/super-admin/ResourceEngagementReport";
import PlatformTicketsTab from "@/components/super-admin/PlatformTicketsTab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, ClipboardCheck, Calendar, CreditCard, GitBranch, Award,
} from "lucide-react";

interface Stats {
  include_internal: boolean;
  total_users: number;
  staff_users: number;
  total_completed: number;
  completed_this_month: number;
  tier_counts: Record<string, number>;
  certification_counts: Record<string, { in_progress: number; certified: number }>;
  active_platform_version: string;
  active_ai_version: string;
}

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "tickets", label: "Tickets" },
  { value: "learning", label: "Learning" },
  { value: "resource-engagement", label: "Resource Engagement" },
] as const;

export default function PlatformHealth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab") ?? "overview";
  const tab = TABS.some(t => t.value === raw) ? raw : "overview";

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Health</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide metrics and reporting</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams(v === "overview" ? {} : { tab: v }, { replace: true })}
        className="w-full"
      >
        <TabsList>
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="tickets" className="mt-6">
          <PlatformTicketsTab />
        </TabsContent>

        <TabsContent value="learning" className="mt-6">
          <LearningReport embedded />
        </TabsContent>
        <TabsContent value="resource-engagement" className="mt-6">
          <ResourceEngagementReport embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [includeInternal, setIncludeInternal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("platform_health_overview" as never, {
        p_include_internal: includeInternal,
      } as never);
      if (cancelled) return;
      if (error) {
        console.error("platform_health_overview failed", error);
        setStats(null);
      } else {
        setStats(data as unknown as Stats);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [includeInternal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { icon: Users, label: "Registered Users", value: stats.total_users },
    { icon: ClipboardCheck, label: "Total Completed Assessments", value: stats.total_completed },
    { icon: Calendar, label: "Completed This Month", value: stats.completed_this_month },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          {includeInternal
            ? "Including internal test accounts and test organizations."
            : `Excluding internal test accounts. ${stats.staff_users} BrainWise staff account${stats.staff_users === 1 ? "" : "s"} not counted above.`}
        </p>
        <Button variant="outline" size="sm" onClick={() => setIncludeInternal((v) => !v)}>
          {includeInternal ? "Hide test accounts" : "Show test accounts"}
        </Button>
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
        {Object.entries(stats.tier_counts).length > 0 ? (
          Object.entries(stats.tier_counts).map(([tier, count]) => (
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

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Practitioner Certifications</h2>
        {Object.keys(stats.certification_counts).length === 0 ? (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">No practitioner certifications found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.certification_counts).map(([type, counts]) => (
              <Card key={type}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">In Progress</span>
                    <span className="font-semibold text-foreground">{counts.in_progress}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Certified</span>
                    <span className="font-semibold text-[var(--bw-forest)]">{counts.certified}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2"><GitBranch className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.active_platform_version}</p>
              <p className="text-xs text-muted-foreground">Active Platform Version</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2"><img src="/brain-icon.png" alt="" className="h-5 w-5" /></div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.active_ai_version}</p>
              <p className="text-xs text-muted-foreground">Active AI Version</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
