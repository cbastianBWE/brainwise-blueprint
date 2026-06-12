import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Blocks, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LessonBuilderList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["lesson-builder-list"],
    queryFn: async () => {
      const itemsRes = await (supabase as any)
        .from("content_items")
        .select("id, title, module_id, item_type, archived_at")
        .eq("item_type", "lesson_blocks")
        .is("archived_at", null)
        .order("title");
      if (itemsRes.error) throw itemsRes.error;
      const items = (itemsRes.data ?? []) as Array<{
        id: string;
        title: string;
        module_id: string | null;
      }>;
      const moduleIds = [...new Set(items.map((i) => i.module_id).filter(Boolean))] as string[];
      let modulesById: Record<string, string> = {};
      if (moduleIds.length > 0) {
        const modulesRes = await (supabase as any)
          .from("modules")
          .select("id, name")
          .in("id", moduleIds);
        if (modulesRes.error) throw modulesRes.error;
        for (const m of modulesRes.data ?? []) {
          modulesById[m.id] = m.name;
        }
      }
      return { items, modulesById };
    },
  });

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.title ?? "").toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-auto px-2 py-1 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/super-admin/content-authoring")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to content authoring
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Lesson Builder</h1>
        <p className="text-muted-foreground">
          Jump straight into any lesson-blocks lesson to edit its blocks.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lessons..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Could not load lessons.
          </CardContent>
        </Card>
      ) : (data?.items ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No lesson-blocks lessons yet. Create one from Content Authoring.
            </p>
            <Button onClick={() => navigate("/super-admin/content-authoring")}>
              Go to Content Authoring
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No lessons match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const moduleName = item.module_id
              ? data?.modulesById[item.module_id] ?? "Unassigned"
              : "Unassigned";
            return (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{moduleName}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/super-admin/content-authoring/lessons/${item.id}?from=lesson-builder`,
                      )
                    }
                  >
                    <Blocks className="mr-1 h-4 w-4" />
                    Edit blocks
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
