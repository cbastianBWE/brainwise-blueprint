import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Library, Trophy, GraduationCap, BookOpenText, Layers,
  Video, FileQuestion, PenLine, Users, Upload, ExternalLink, CalendarClock,
  ChevronRight, ChevronDown, Search, Plus,
} from "lucide-react";

type NodeType = "cp" | "cu" | "mo" | "ci";

interface TreeNode {
  type: NodeType;
  id: string;
  name: string;
  isPublished?: boolean;
  itemType?: string;
  children: TreeNode[];
}

const TYPE_LABELS: Record<NodeType, string> = {
  cp: "Certification path",
  cu: "Curriculum",
  mo: "Module",
  ci: "Content item",
};

function ItemTypeIcon({ itemType, className }: { itemType?: string; className?: string }) {
  const map: Record<string, typeof Video> = {
    video: Video,
    quiz: FileQuestion,
    written_summary: PenLine,
    skills_practice: Users,
    file_upload: Upload,
    external_link: ExternalLink,
    live_event: CalendarClock,
    lesson_blocks: Layers,
  };
  const Icon = (itemType && map[itemType]) || Layers;
  return <Icon className={className} />;
}

function NodeTypeIcon({ node, className }: { node: TreeNode; className?: string }) {
  if (node.type === "cp") return <Trophy className={className} />;
  if (node.type === "cu") return <GraduationCap className={className} />;
  if (node.type === "mo") return <BookOpenText className={className} />;
  return <ItemTypeIcon itemType={node.itemType} className={className} />;
}

function nodeKey(n: TreeNode) {
  return `${n.type}:${n.id}`;
}

function collectVisible(
  nodes: TreeNode[],
  query: string,
): { filtered: TreeNode[]; autoExpand: Set<string> } {
  const autoExpand = new Set<string>();
  const q = query.trim().toLowerCase();
  if (!q) return { filtered: nodes, autoExpand };

  const walk = (n: TreeNode): TreeNode | null => {
    const selfMatch = n.name.toLowerCase().includes(q);
    const kids = n.children.map(walk).filter(Boolean) as TreeNode[];
    if (selfMatch || kids.length > 0) {
      if (kids.length > 0) autoExpand.add(nodeKey(n));
      return { ...n, children: kids };
    }
    return null;
  };

  const filtered = nodes.map(walk).filter(Boolean) as TreeNode[];
  return { filtered, autoExpand };
}

interface RowProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selectedKey: string | null;
  onToggle: (k: string) => void;
  onSelect: (k: string) => void;
}

function TreeRow({ node, depth, expanded, selectedKey, onToggle, onSelect }: RowProps) {
  const key = nodeKey(node);
  const canExpand = node.type !== "ci";
  const isOpen = expanded.has(key);
  const isSelected = selectedKey === key;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(key);
          }
        }}
        className={cn(
          "group flex items-center gap-1.5 rounded-sm py-1 pr-2 cursor-pointer text-sm",
          isSelected ? "bg-muted" : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {canExpand ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(key);
            }}
            className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="inline-block h-4 w-4" />
        )}
        <NodeTypeIcon node={node} className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate" title={node.name}>{node.name}</span>
        {node.type !== "ci" && (
          <Badge variant={node.isPublished ? "default" : "secondary"} className="ml-auto shrink-0">
            {node.isPublished ? "Published" : "Draft"}
          </Badge>
        )}
      </div>
      {canExpand && isOpen && node.children.map((c) => (
        <TreeRow
          key={nodeKey(c)}
          node={c}
          depth={depth + 1}
          expanded={expanded}
          selectedKey={selectedKey}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export default function ContentAuthoring() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const initialExpanded = useMemo(() => {
    const raw = searchParams.get("expanded");
    return new Set<string>(raw ? raw.split(",").filter(Boolean) : []);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);
  const [selectedKey, setSelectedKey] = useState<string | null>(searchParams.get("selected"));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["content-authoring-tree"],
    queryFn: async () => {
      const [certPaths, curricula, modules, contentItems, cpcLinks, cmLinks] = await Promise.all([
        supabase.from("certification_paths").select("*").is("archived_at", null).order("display_order").order("name"),
        supabase.from("curricula").select("*").is("archived_at", null).order("name"),
        supabase.from("modules").select("*").is("archived_at", null).order("name"),
        supabase.from("content_items").select("*").is("archived_at", null).order("display_order"),
        supabase.from("certification_path_curricula").select("*").order("display_order"),
        supabase.from("curriculum_modules").select("*").order("display_order"),
      ]);
      for (const r of [certPaths, curricula, modules, contentItems, cpcLinks, cmLinks]) {
        if (r.error) throw r.error;
      }
      return {
        certPaths: certPaths.data ?? [],
        curricula: curricula.data ?? [],
        modules: modules.data ?? [],
        contentItems: contentItems.data ?? [],
        cpcLinks: cpcLinks.data ?? [],
        cmLinks: cmLinks.data ?? [],
      };
    },
    staleTime: 30_000,
  });

  const { certPathTree, standaloneCurricula, standaloneModules, allKeyMap } = useMemo(() => {
    const empty = { certPathTree: [] as TreeNode[], standaloneCurricula: [] as TreeNode[], standaloneModules: [] as TreeNode[], allKeyMap: new Map<string, TreeNode[]>() };
    if (!data) return empty;

    const { certPaths, curricula, modules, contentItems, cpcLinks, cmLinks } = data;

    const itemsByModule = new Map<string, any[]>();
    for (const ci of contentItems) {
      const arr = itemsByModule.get(ci.module_id) ?? [];
      arr.push(ci);
      itemsByModule.set(ci.module_id, arr);
    }

    const buildModuleNode = (m: any): TreeNode => ({
      type: "mo",
      id: m.id,
      name: m.name ?? m.title ?? "(unnamed module)",
      isPublished: !!m.is_published,
      children: (itemsByModule.get(m.id) ?? []).map((ci): TreeNode => ({
        type: "ci",
        id: ci.id,
        name: ci.name ?? ci.title ?? "(unnamed item)",
        itemType: ci.item_type,
        children: [],
      })),
    });

    const moduleById = new Map(modules.map((m: any) => [m.id, m]));
    const curriculumById = new Map(curricula.map((c: any) => [c.id, c]));

    const modulesByCurriculum = new Map<string, any[]>();
    for (const link of [...cmLinks].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))) {
      const m = moduleById.get((link as any).module_id);
      if (!m) continue;
      const arr = modulesByCurriculum.get((link as any).curriculum_id) ?? [];
      arr.push(m);
      modulesByCurriculum.set((link as any).curriculum_id, arr);
    }

    const buildCurriculumNode = (c: any): TreeNode => ({
      type: "cu",
      id: c.id,
      name: c.name ?? c.title ?? "(unnamed curriculum)",
      isPublished: !!c.is_published,
      children: (modulesByCurriculum.get(c.id) ?? []).map(buildModuleNode),
    });

    const curriculaByCertPath = new Map<string, any[]>();
    for (const link of [...cpcLinks].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))) {
      const c = curriculumById.get((link as any).curriculum_id);
      if (!c) continue;
      const arr = curriculaByCertPath.get((link as any).certification_path_id) ?? [];
      arr.push(c);
      curriculaByCertPath.set((link as any).certification_path_id, arr);
    }

    const certPathTree: TreeNode[] = certPaths.map((cp: any) => ({
      type: "cp" as const,
      id: cp.id,
      name: cp.name ?? cp.title ?? "(unnamed cert path)",
      isPublished: !!cp.is_published,
      children: (curriculaByCertPath.get(cp.id) ?? []).map(buildCurriculumNode),
    }));

    const linkedCurriculumIds = new Set(cpcLinks.map((l: any) => l.curriculum_id));
    const standaloneCurricula: TreeNode[] = curricula
      .filter((c: any) => !linkedCurriculumIds.has(c.id))
      .map(buildCurriculumNode);

    const linkedModuleIds = new Set(cmLinks.map((l: any) => l.module_id));
    const standaloneModules: TreeNode[] = modules
      .filter((m: any) => !linkedModuleIds.has(m.id))
      .map(buildModuleNode);

    // build ancestor map for breadcrumbs
    const allKeyMap = new Map<string, TreeNode[]>();
    const walk = (n: TreeNode, ancestors: TreeNode[]) => {
      const path = [...ancestors, n];
      allKeyMap.set(nodeKey(n), path);
      for (const c of n.children) walk(c, path);
    };
    for (const n of [...certPathTree, ...standaloneCurricula, ...standaloneModules]) walk(n, []);

    return { certPathTree, standaloneCurricula, standaloneModules, allKeyMap };
  }, [data]);

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (expanded.size > 0) params.set("expanded", Array.from(expanded).join(","));
    else params.delete("expanded");
    if (selectedKey) params.set("selected", selectedKey);
    else params.delete("selected");
    setSearchParams(params, { replace: true });
  }, [expanded, selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleNode = (k: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const selectNode = (k: string) => setSelectedKey(k);

  const handleComingSoon = () => {
    toast({ title: "Coming in the next prompt" });
  };

  const sectionsRaw: { label: string; nodes: TreeNode[] }[] = [
    { label: "Certification Paths", nodes: certPathTree },
    { label: "Standalone Curricula", nodes: standaloneCurricula },
    { label: "Standalone Modules", nodes: standaloneModules },
  ];

  const sections = sectionsRaw.map((s) => {
    const { filtered, autoExpand } = collectVisible(s.nodes, debouncedSearch);
    return { ...s, nodes: filtered, autoExpand };
  });

  const effectiveExpanded = useMemo(() => {
    if (!debouncedSearch.trim()) return expanded;
    const merged = new Set(expanded);
    for (const s of sections) for (const k of s.autoExpand) merged.add(k);
    return merged;
  }, [expanded, debouncedSearch, sections]);

  const totalTopLevel = certPathTree.length + standaloneCurricula.length + standaloneModules.length;
  const selectedPath = selectedKey ? allKeyMap.get(selectedKey) ?? null : null;
  const selectedNode = selectedPath ? selectedPath[selectedPath.length - 1] : null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Authoring</h1>
        <p className="text-muted-foreground mt-1">
          Build certification paths, curricula, modules, lessons, and content items. Super admin only.
        </p>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "380px 1fr" }}>
        {/* Tree navigator */}
        <Card className="flex flex-col h-[calc(100vh-220px)]">
          <CardHeader className="space-y-3 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search content..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleComingSoon}>
                <Plus className="h-3.5 w-3.5" /> Cert Path
              </Button>
              <Button size="sm" variant="outline" onClick={handleComingSoon}>
                <Plus className="h-3.5 w-3.5" /> Curriculum
              </Button>
              <Button size="sm" variant="outline" onClick={handleComingSoon}>
                <Plus className="h-3.5 w-3.5" /> Module
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
                <p className="text-sm text-muted-foreground">Could not load content tree.</p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </div>
            ) : totalTopLevel === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Library className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No content authored yet.</p>
                <p className="text-xs text-muted-foreground">Click + Cert Path to start.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.label} className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.label}
                    </h3>
                    {section.nodes.length === 0 ? (
                      <p className="pl-2 text-xs italic text-muted-foreground">(none)</p>
                    ) : (
                      section.nodes.map((n) => (
                        <TreeRow
                          key={nodeKey(n)}
                          node={n}
                          depth={0}
                          expanded={effectiveExpanded}
                          selectedKey={selectedKey}
                          onToggle={toggleNode}
                          onSelect={selectNode}
                        />
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right pane */}
        <div>
          {!selectedNode ? (
            <Card>
              <CardContent className="flex items-center justify-center py-24">
                <p className="text-sm text-muted-foreground">
                  Select an item from the tree to view or edit.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                {selectedPath!.map((n, idx) => {
                  const isLast = idx === selectedPath!.length - 1;
                  const label = `${TYPE_LABELS[n.type]}: ${n.name}`;
                  return (
                    <span key={nodeKey(n)} className="flex items-center gap-1">
                      {isLast ? (
                        <span className="font-medium text-foreground">{label}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => selectNode(nodeKey(n))}
                          className="hover:text-foreground hover:underline"
                        >
                          {label}
                        </button>
                      )}
                      {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
                    </span>
                  );
                })}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{TYPE_LABELS[selectedNode.type]} editor</CardTitle>
                  <CardDescription>
                    The {TYPE_LABELS[selectedNode.type].toLowerCase()} editor will be built in the next prompt.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</p>
                    <p className="mt-1 text-sm">{selectedNode.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedNode.id}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
