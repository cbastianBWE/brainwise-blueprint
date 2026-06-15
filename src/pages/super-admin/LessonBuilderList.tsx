import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Blocks,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ModuleOption = {
  id: string;
  name: string;
  curriculumLabel: string;
};

export default function LessonBuilderList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newModuleId, setNewModuleId] = useState<string | null>(null);
  const [completionMode, setCompletionMode] = useState<
    "explicit_continue" | "scroll_and_checks"
  >("explicit_continue");
  const [modulePickerOpen, setModulePickerOpen] = useState(false);

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

  const { data: moduleOptions } = useQuery({
    queryKey: ["lesson-builder-modules"],
    queryFn: async (): Promise<ModuleOption[]> => {
      const modulesRes = await (supabase as any)
        .from("modules")
        .select("id, name")
        .is("archived_at", null)
        .order("name");
      if (modulesRes.error) throw modulesRes.error;
      const modules = (modulesRes.data ?? []) as Array<{ id: string; name: string }>;
      const moduleIds = modules.map((m) => m.id);

      let curriculumNamesByModule: Record<string, string[]> = {};
      if (moduleIds.length > 0) {
        const cmRes = await (supabase as any)
          .from("curriculum_modules")
          .select("module_id, curriculum_id")
          .in("module_id", moduleIds);
        if (cmRes.error) throw cmRes.error;
        const cmRows = (cmRes.data ?? []) as Array<{
          module_id: string;
          curriculum_id: string;
        }>;
        const curriculumIds = [...new Set(cmRows.map((r) => r.curriculum_id))];
        let curriculaById: Record<string, string> = {};
        if (curriculumIds.length > 0) {
          const cRes = await (supabase as any)
            .from("curricula")
            .select("id, name")
            .in("id", curriculumIds);
          if (cRes.error) throw cRes.error;
          for (const c of cRes.data ?? []) {
            curriculaById[c.id] = c.name;
          }
        }
        for (const row of cmRows) {
          const name = curriculaById[row.curriculum_id];
          if (!name) continue;
          if (!curriculumNamesByModule[row.module_id]) {
            curriculumNamesByModule[row.module_id] = [];
          }
          curriculumNamesByModule[row.module_id].push(name);
        }
      }

      const options: ModuleOption[] = modules.map((m) => ({
        id: m.id,
        name: m.name,
        curriculumLabel:
          (curriculumNamesByModule[m.id] ?? []).join(", ") || "No curriculum",
      }));
      options.sort((a, b) => a.name.localeCompare(b.name));
      return options;
    },
  });

  const selectedModule = useMemo(
    () => (moduleOptions ?? []).find((m) => m.id === newModuleId) ?? null,
    [moduleOptions, newModuleId],
  );

  const resetDialog = () => {
    setNewTitle("");
    setNewModuleId(null);
    setCompletionMode("explicit_continue");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: created, error: rpcError } = await (supabase as any).rpc(
        "upsert_content_item",
        {
          p_id: null,
          p_module_id: newModuleId,
          p_item_type: "lesson_blocks",
          p_title: newTitle.trim(),
          p_description: "",
          p_display_order: 0,
          p_is_required: false,
          p_type_config: {},
          p_lesson_completion_mode: completionMode,
          p_reason: "Created via Lesson Builder",
        },
      );
      if (rpcError) throw rpcError;
      return created;
    },
    onSuccess: (created) => {
      const newId = (created as any)?.id;
      queryClient.invalidateQueries({ queryKey: ["lesson-builder-list"] });
      setCreateOpen(false);
      resetDialog();
      if (newId) {
        navigate(
          `/super-admin/content-authoring/lessons/${newId}?from=lesson-builder`,
        );
      }
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Could not create lesson",
        description: err?.message ?? "Unknown error",
      });
    },
  });

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.title ?? "").toLowerCase().includes(q));
  }, [data, search]);

  const canCreate =
    newTitle.trim().length > 0 && !!newModuleId && !createMutation.isPending;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
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
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Lesson
        </Button>
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
              No lesson-blocks lessons yet. Create one to get started.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Lesson
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/super-admin/content-authoring")}
            >
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

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Lesson</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-lesson-title">Lesson title</Label>
              <Input
                id="new-lesson-title"
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Introduction to Active Listening"
              />
            </div>

            <div className="space-y-2">
              <Label>Module</Label>
              <Popover open={modulePickerOpen} onOpenChange={setModulePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={modulePickerOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedModule ? (
                      <span className="flex min-w-0 flex-col items-start text-left">
                        <span className="truncate">{selectedModule.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {selectedModule.curriculumLabel}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select a module</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search modules..." />
                    <CommandList>
                      <CommandEmpty>No modules found.</CommandEmpty>
                      <CommandGroup>
                        {(moduleOptions ?? []).map((m) => (
                          <CommandItem
                            key={m.id}
                            value={`${m.name} ${m.curriculumLabel}`}
                            onSelect={() => {
                              setNewModuleId(m.id);
                              setModulePickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newModuleId === m.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate">{m.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {m.curriculumLabel}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Completion mode</Label>
              <Select
                value={completionMode}
                onValueChange={(v) =>
                  setCompletionMode(v as "explicit_continue" | "scroll_and_checks")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="explicit_continue">
                    Explicit Continue (paged sections)
                  </SelectItem>
                  <SelectItem value="scroll_and_checks">
                    Scroll and Checks
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetDialog();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canCreate}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Create & open editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
