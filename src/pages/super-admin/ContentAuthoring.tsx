import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Library, ChevronRight, ChevronDown, Search, Plus,
} from "lucide-react";
import CertPathEditor from "./editors/CertPathEditor";
import CurriculumEditor from "./editors/CurriculumEditor";
import ModuleEditor from "./editors/ModuleEditor";
import ContentItemEditor from "./editors/ContentItemEditor";
import { NodeTypeIcon, TYPE_LABELS } from "./editors/_shared";
import type { TreeNode } from "./editors/_shared";

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

  const queryClient = useQueryClient();

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

  const { certPathTree, allCurriculaNodes, allModulesNodes, allKeyMap } = useMemo(() => {
    const empty = { certPathTree: [] as TreeNode[], allCurriculaNodes: [] as TreeNode[], allModulesNodes: [] as TreeNode[], allKeyMap: new Map<string, TreeNode[]>() };
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

    const allCurriculaNodes: TreeNode[] = curricula.map(buildCurriculumNode);
    const allModulesNodes: TreeNode[] = modules.map(buildModuleNode);

    // build ancestor map for breadcrumbs
    const allKeyMap = new Map<string, TreeNode[]>();
    const walk = (n: TreeNode, ancestors: TreeNode[]) => {
      const path = [...ancestors, n];
      allKeyMap.set(nodeKey(n), path);
      for (const c of n.children) walk(c, path);
    };
    for (const n of [...certPathTree, ...allCurriculaNodes, ...allModulesNodes]) walk(n, []);

    return { certPathTree, allCurriculaNodes, allModulesNodes, allKeyMap };
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

  const certPathsByCurriculum = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const link of (data?.cpcLinks ?? []) as any[]) {
      const arr = m.get(link.curriculum_id) ?? [];
      arr.push(link.certification_path_id);
      m.set(link.curriculum_id, arr);
    }
    return m;
  }, [data?.cpcLinks]);

  const curriculaByModule = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const link of (data?.cmLinks ?? []) as any[]) {
      const arr = m.get(link.module_id) ?? [];
      arr.push(link.curriculum_id);
      m.set(link.module_id, arr);
    }
    return m;
  }, [data?.cmLinks]);

  const moduleByContentItem = useMemo(() => {
    const m = new Map<string, string>();
    for (const ci of (data?.contentItems ?? []) as any[]) {
      m.set(ci.id, ci.module_id);
    }
    return m;
  }, [data?.contentItems]);

  const selectNode = (k: string) => {
    setSelectedKey(k);
    if (k.startsWith("cu:") && !k.startsWith("cu:new")) {
      const cuId = k.slice("cu:".length);
      const parentCpIds = certPathsByCurriculum.get(cuId) ?? [];
      if (parentCpIds.length > 0) {
        setExpanded((prev) => {
          const next = new Set(prev);
          for (const cpId of parentCpIds) next.add(`cp:${cpId}`);
          return next;
        });
      }
    } else if (k.startsWith("mo:") && !k.startsWith("mo:new")) {
      const moId = k.slice("mo:".length);
      const parentCuIds = curriculaByModule.get(moId) ?? [];
      if (parentCuIds.length > 0) {
        setExpanded((prev) => {
          const next = new Set(prev);
          for (const cuId of parentCuIds) {
            next.add(`cu:${cuId}`);
            const cpIds = certPathsByCurriculum.get(cuId) ?? [];
            for (const cpId of cpIds) next.add(`cp:${cpId}`);
          }
          return next;
        });
      }
    } else if (k.startsWith("ci:") && !k.startsWith("ci:new")) {
      const ciId = k.slice("ci:".length);
      const parentMoId = moduleByContentItem.get(ciId);
      if (parentMoId) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.add(`mo:${parentMoId}`);
          const parentCuIds = curriculaByModule.get(parentMoId) ?? [];
          for (const cuId of parentCuIds) {
            next.add(`cu:${cuId}`);
            const cpIds = certPathsByCurriculum.get(cuId) ?? [];
            for (const cpId of cpIds) next.add(`cp:${cpId}`);
          }
          return next;
        });
      }
    }
  };


  const sectionsRaw: { label: string; nodes: TreeNode[] }[] = [
    { label: "Certification Paths", nodes: certPathTree },
    { label: "All Curricula", nodes: allCurriculaNodes },
    { label: "All Modules", nodes: allModulesNodes },
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

  const totalTopLevel = certPathTree.length + allCurriculaNodes.length + allModulesNodes.length;
  const selectedPath = selectedKey ? allKeyMap.get(selectedKey) ?? null : null;
  const selectedNode = selectedPath ? selectedPath[selectedPath.length - 1] : null;

  const isCurriculumCreate = selectedKey?.startsWith("cu:new") ?? false;
  const curriculumCreateAttachToCpId = (() => {
    if (!selectedKey) return null;
    if (!selectedKey.startsWith("cu:new:")) return null;
    return selectedKey.slice("cu:new:".length) || null;
  })();

  const isModuleCreate = selectedKey?.startsWith("mo:new") ?? false;
  const moduleCreateAttachToCuId = (() => {
    if (!selectedKey) return null;
    if (!selectedKey.startsWith("mo:new:")) return null;
    return selectedKey.slice("mo:new:".length) || null;
  })();

  const isContentItemCreate = selectedKey?.startsWith("ci:new") ?? false;
  const contentItemCreateAttachToMoId = (() => {
    if (!selectedKey) return null;
    if (!selectedKey.startsWith("ci:new:")) return null;
    return selectedKey.slice("ci:new:".length) || null;
  })();

  const cpAttachedIds = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const link of (data?.cpcLinks ?? []) as any[]) {
      const set = m.get(link.certification_path_id) ?? new Set<string>();
      set.add(link.curriculum_id);
      m.set(link.certification_path_id, set);
    }
    return m;
  }, [data?.cpcLinks]);

  const cuAttachedModuleIds = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const link of (data?.cmLinks ?? []) as any[]) {
      const set = m.get(link.curriculum_id) ?? new Set<string>();
      set.add(link.module_id);
      m.set(link.curriculum_id, set);
    }
    return m;
  }, [data?.cmLinks]);

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
        <Card className="flex flex-col self-start sticky top-4 max-h-[calc(100vh-2rem)]">
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
              <Button size="sm" variant="outline" onClick={() => setSelectedKey("cp:new")}>
                <Plus className="h-3.5 w-3.5" /> Cert Path
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedKey("cu:new")}>
                <Plus className="h-3.5 w-3.5" /> Curriculum
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedKey("mo:new")}>
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
          {!selectedNode && selectedKey !== "cp:new" && !isCurriculumCreate && !isModuleCreate && !isContentItemCreate ? (
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
                {selectedKey === "cp:new" ? (
                  <span className="font-medium text-foreground">New certification path</span>
                ) : isCurriculumCreate ? (
                  curriculumCreateAttachToCpId ? (
                    <>
                      <span>
                        Cert path: {(data?.certPaths ?? []).find((p: any) => p.id === curriculumCreateAttachToCpId)?.name ?? "(unknown)"}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">New curriculum</span>
                    </>
                  ) : (
                    <span className="font-medium text-foreground">New curriculum</span>
                  )
                ) : isModuleCreate ? (
                  moduleCreateAttachToCuId ? (
                    <>
                      <span>
                        Curriculum: {(data?.curricula ?? []).find((c: any) => c.id === moduleCreateAttachToCuId)?.name ?? "(unknown)"}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">New module</span>
                    </>
                  ) : (
                    <span className="font-medium text-foreground">New module</span>
                  )
                ) : isContentItemCreate ? (
                  contentItemCreateAttachToMoId ? (
                    <>
                      <span>
                        Module: {(data?.modules ?? []).find((m: any) => m.id === contentItemCreateAttachToMoId)?.name ?? "(unknown)"}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">New content item</span>
                    </>
                  ) : (
                    <span className="font-medium text-foreground">New content item</span>
                  )
                ) : (
                  selectedPath!.map((n, idx) => {
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
                  })
                )}
              </div>

              {selectedKey === "cp:new" ? (
                <CertPathEditor
                  key="cp:new"
                  mode="create"
                  initial={null}
                  allCertPaths={data?.certPaths ?? []}
                  allCurricula={data?.curricula ?? []}
                  attachedCurriculumIds={new Set()}
                  onSaved={(newId) => {
                    refetch();
                    if (newId) setSelectedKey(`cp:${newId}`);
                    else setSelectedKey(null);
                  }}
                  onCancelCreate={() => setSelectedKey(null)}
                />
              ) : selectedNode?.type === "cp" ? (
                <CertPathEditor
                  key={`cp:${selectedNode.id}`}
                  mode="edit"
                  initial={(data?.certPaths ?? []).find((p: any) => p.id === selectedNode.id) ?? null}
                  allCertPaths={data?.certPaths ?? []}
                  allCurricula={data?.curricula ?? []}
                  attachedCurriculumIds={cpAttachedIds.get(selectedNode.id) ?? new Set()}
                  onSaved={() => refetch()}
                  onArchived={() => {
                    refetch();
                    setSelectedKey(null);
                  }}
                  onRequestCreateAttachedCurriculum={() => {
                    setSelectedKey(`cu:new:${selectedNode.id}`);
                  }}
                  onRefetch={async () => { await refetch(); }}
                  onExpandSelf={() => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      next.add(`cp:${selectedNode.id}`);
                      return next;
                    });
                  }}
                  onInvalidateAttachedList={async () => {
                    await queryClient.invalidateQueries({
                      queryKey: ["cert-path-attached-curricula", selectedNode.id],
                    });
                  }}
                  onSelectCurriculum={(curriculumId) => {
                    selectNode(`cu:${curriculumId}`);
                  }}
                />
              ) : isCurriculumCreate ? (
                <CurriculumEditor
                  key={selectedKey ?? "cu:new"}
                  mode="create"
                  initial={null}
                  allCurricula={data?.curricula ?? []}
                  allCertPaths={data?.certPaths ?? []}
                  allModules={data?.modules ?? []}
                  attachedModuleIds={new Set()}
                  attachToCertPathId={curriculumCreateAttachToCpId}
                  onSaved={async (newId, attachedCertPathId) => {
                    if (attachedCertPathId) {
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        next.add(`cp:${attachedCertPathId}`);
                        return next;
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ["cert-path-attached-curricula", attachedCertPathId],
                      });
                    }
                    await refetch();
                    if (newId) setSelectedKey(`cu:${newId}`);
                    else setSelectedKey(null);
                  }}
                  onCancelCreate={() => setSelectedKey(null)}
                />
              ) : selectedNode?.type === "cu" ? (
                <CurriculumEditor
                  key={`cu:${selectedNode.id}`}
                  mode="edit"
                  initial={(data?.curricula ?? []).find((c: any) => c.id === selectedNode.id) ?? null}
                  allCurricula={data?.curricula ?? []}
                  allCertPaths={data?.certPaths ?? []}
                  allModules={data?.modules ?? []}
                  attachedModuleIds={cuAttachedModuleIds.get(selectedNode.id) ?? new Set()}
                  attachToCertPathId={null}
                  onSaved={() => refetch()}
                  onArchived={() => {
                    refetch();
                    setSelectedKey(null);
                  }}
                  onRequestCreateAttachedModule={() => {
                    setSelectedKey(`mo:new:${selectedNode.id}`);
                  }}
                  onRefetch={async () => { await refetch(); }}
                  onExpandSelf={() => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      next.add(`cu:${selectedNode.id}`);
                      return next;
                    });
                  }}
                  onInvalidateAttachedModulesList={async () => {
                    await queryClient.invalidateQueries({
                      queryKey: ["curriculum-attached-modules", selectedNode.id],
                    });
                  }}
                  onSelectModule={(moduleId) => {
                    selectNode(`mo:${moduleId}`);
                  }}
                />
              ) : isModuleCreate ? (
                <ModuleEditor
                  key={selectedKey ?? "mo:new"}
                  mode="create"
                  initial={null}
                  allModules={data?.modules ?? []}
                  allCurricula={data?.curricula ?? []}
                  attachToCurriculumId={moduleCreateAttachToCuId}
                  onSaved={async (newId, attachedCurriculumId) => {
                    if (attachedCurriculumId) {
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        next.add(`cu:${attachedCurriculumId}`);
                        const cpIds = certPathsByCurriculum.get(attachedCurriculumId) ?? [];
                        for (const cpId of cpIds) next.add(`cp:${cpId}`);
                        return next;
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ["curriculum-attached-modules", attachedCurriculumId],
                      });
                    }
                    await refetch();
                    if (newId) setSelectedKey(`mo:${newId}`);
                    else setSelectedKey(null);
                  }}
                  onCancelCreate={() => setSelectedKey(null)}
                />
              ) : selectedNode?.type === "mo" ? (
                <ModuleEditor
                  key={`mo:${selectedNode.id}`}
                  mode="edit"
                  initial={(data?.modules ?? []).find((m: any) => m.id === selectedNode.id) ?? null}
                  allModules={data?.modules ?? []}
                  allCurricula={data?.curricula ?? []}
                  attachToCurriculumId={null}
                  onSaved={() => refetch()}
                  onArchived={() => {
                    refetch();
                    setSelectedKey(null);
                  }}
                  onRequestCreateAttachedContentItem={() => {
                    setSelectedKey(`ci:new:${selectedNode.id}`);
                  }}
                  onRefetch={async () => { await refetch(); }}
                  onExpandSelf={() => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      next.add(`mo:${selectedNode.id}`);
                      return next;
                    });
                  }}
                  onInvalidateAttachedContentItemsList={async () => {
                    await queryClient.invalidateQueries({
                      queryKey: ["module-attached-content-items", selectedNode.id],
                    });
                  }}
                  onSelectContentItem={(contentItemId) => {
                    selectNode(`ci:${contentItemId}`);
                  }}
                />
              ) : isContentItemCreate ? (
                <ContentItemEditor
                  key={selectedKey ?? "ci:new"}
                  mode="create"
                  initial={null}
                  parentModule={contentItemCreateAttachToMoId
                    ? (data?.modules ?? []).find((m: any) => m.id === contentItemCreateAttachToMoId) ?? null
                    : null}
                  allModules={data?.modules ?? []}
                  attachToModuleId={contentItemCreateAttachToMoId}
                  onSaved={async (newId) => {
                    if (contentItemCreateAttachToMoId) {
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        next.add(`mo:${contentItemCreateAttachToMoId}`);
                        const parentCuIds = curriculaByModule.get(contentItemCreateAttachToMoId) ?? [];
                        for (const cuId of parentCuIds) {
                          next.add(`cu:${cuId}`);
                          const cpIds = certPathsByCurriculum.get(cuId) ?? [];
                          for (const cpId of cpIds) next.add(`cp:${cpId}`);
                        }
                        return next;
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ["module-attached-content-items", contentItemCreateAttachToMoId],
                      });
                    }
                    await refetch();
                    if (newId) setSelectedKey(`ci:${newId}`);
                    else setSelectedKey(null);
                  }}
                  onCancelCreate={() => setSelectedKey(null)}
                />
              ) : selectedNode?.type === "ci" ? (
                <ContentItemEditor
                  key={`ci:${selectedNode.id}`}
                  mode="edit"
                  initial={(data?.contentItems ?? []).find((ci: any) => ci.id === selectedNode.id) ?? null}
                  parentModule={(() => {
                    const ci = (data?.contentItems ?? []).find((ci: any) => ci.id === selectedNode.id);
                    if (!ci) return null;
                    return (data?.modules ?? []).find((m: any) => m.id === ci.module_id) ?? null;
                  })()}
                  allModules={data?.modules ?? []}
                  attachToModuleId={null}
                  onSaved={async () => {
                    await queryClient.invalidateQueries({
                      queryKey: ["module-attached-content-items", (data?.contentItems ?? []).find((ci: any) => ci.id === selectedNode.id)?.module_id],
                    });
                    await refetch();
                  }}
                  onArchived={async () => {
                    const moId = (data?.contentItems ?? []).find((ci: any) => ci.id === selectedNode.id)?.module_id;
                    if (moId) {
                      await queryClient.invalidateQueries({
                        queryKey: ["module-attached-content-items", moId],
                      });
                    }
                    await refetch();
                    setSelectedKey(null);
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-24">
                    <p className="text-sm text-muted-foreground">Unknown selection.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
