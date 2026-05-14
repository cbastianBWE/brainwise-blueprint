import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Library, Search, Plus } from "lucide-react";
import ResourceEditor from "./resource-editors/ResourceEditor";

export default function AdminResourceAuthoring() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const [selectedKey, setSelectedKey] = useState<string | null>(searchParams.get("selected"));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["resource-authoring-data"],
    queryFn: async () => {
      const [tabsRes, resourcesRes, orgsRes] = await Promise.all([
        supabase.from("resource_tabs").select("*").order("display_order"),
        supabase.from("resources").select("*").is("archived_at", null),
        supabase.from("organizations").select("id, name"),
      ]);
      for (const r of [tabsRes, resourcesRes, orgsRes]) {
        if (r.error) throw r.error;
      }
      return {
        tabs: (tabsRes.data ?? []) as any[],
        resources: (resourcesRes.data ?? []) as any[],
        organizations: (orgsRes.data ?? []) as any[],
      };
    },
    staleTime: 30_000,
  });

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (selectedKey) params.set("selected", selectedKey);
    else params.delete("selected");
    setSearchParams(params, { replace: true });
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabsForPicker = useMemo(
    () => (data?.tabs ?? []).filter((t: any) => !t.is_learning_tree),
    [data?.tabs]
  );

  const grouped = useMemo(() => {
    const tabs = data?.tabs ?? [];
    const resources = data?.resources ?? [];
    const q = debouncedSearch.trim().toLowerCase();
    const filtered = q
      ? resources.filter((r: any) => (r.title ?? "").toLowerCase().includes(q))
      : resources;
    return tabs.map((t: any) => ({
      tab: t,
      resources: filtered
        .filter((r: any) => r.resource_tab_id === t.id)
        .sort((a: any, b: any) => (a.title ?? "").localeCompare(b.title ?? "")),
    }));
  }, [data, debouncedSearch]);

  const totalResources = (data?.resources ?? []).length;

  const isCreate = selectedKey === "resource:new";
  const selectedResourceId = selectedKey?.startsWith("resource:") && !isCreate
    ? selectedKey.slice("resource:".length)
    : null;
  const selectedResource = selectedResourceId
    ? (data?.resources ?? []).find((r: any) => r.id === selectedResourceId) ?? null
    : null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Authoring</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage resources shown in the Resources tab. Super admin only.
        </p>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "380px 1fr" }}>
        {/* Navigator */}
        <Card className="flex flex-col h-[calc(100vh-7rem)] self-start">
          <CardHeader className="space-y-3 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedKey("resource:new")}>
                <Plus className="h-3.5 w-3.5" /> Add Resource
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">Could not load resources.</p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </div>
            ) : totalResources === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Library className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No resources authored yet.</p>
                <p className="text-xs text-muted-foreground">Click + Add Resource to start.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {grouped.map(({ tab, resources }) => (
                  <div key={tab.id} className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {tab.name}
                    </h3>
                    {resources.length === 0 ? (
                      <p className="pl-2 text-xs italic text-muted-foreground">(none)</p>
                    ) : (
                      resources.map((r: any) => {
                        const key = `resource:${r.id}`;
                        const isSelected = selectedKey === key;
                        return (
                          <div
                            key={r.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedKey(key)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedKey(key);
                              }
                            }}
                            className={cn(
                              "group flex items-center gap-1.5 rounded-sm px-2 py-1 cursor-pointer text-sm",
                              isSelected ? "bg-muted" : "hover:bg-muted/50"
                            )}
                          >
                            <span className="flex-1 truncate" title={r.title}>{r.title}</span>
                            <Badge variant={r.is_published ? "default" : "secondary"} className="ml-auto shrink-0">
                              {r.is_published ? "Published" : "Draft"}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right pane */}
        <div>
          {!isCreate && !selectedResource ? (
            <Card>
              <CardContent className="flex items-center justify-center py-24">
                <p className="text-sm text-muted-foreground">
                  Select a resource from the list to view or edit.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                {isCreate ? (
                  <span className="font-medium text-foreground">New resource</span>
                ) : (
                  <span className="font-medium text-foreground">
                    Resource: {selectedResource?.title ?? "(unknown)"}
                  </span>
                )}
              </div>

              {isCreate ? (
                <ResourceEditor
                  key="resource:new"
                  mode="create"
                  initial={null}
                  resourceTabs={tabsForPicker}
                  organizations={data?.organizations ?? []}
                  onSaved={async (newId) => {
                    await refetch();
                    if (newId) setSelectedKey(`resource:${newId}`);
                    else setSelectedKey(null);
                  }}
                  onCancelCreate={() => setSelectedKey(null)}
                />
              ) : selectedResource ? (
                <ResourceEditor
                  key={`resource:${selectedResource.id}`}
                  mode="edit"
                  initial={selectedResource}
                  resourceTabs={tabsForPicker}
                  organizations={data?.organizations ?? []}
                  onSaved={async () => { await refetch(); }}
                  onArchived={async () => {
                    await refetch();
                    setSelectedKey(null);
                  }}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
