import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  Plus,
  MoreHorizontal,
  Copy,
  Archive,
  ExternalLink,
  Newspaper,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// TODO(nav): a "Newsletter" entry pointing to /super-admin/newsletter has
// been added to AppSidebar.tsx under the super-admin nav block.

type StatusFilter = "all" | "draft" | "scheduled" | "published" | "unpublished" | "archived";
type GateFilter = "any" | "public" | "subscribers" | "plan_tier";

interface ArticleRow {
  id: string;
  title: string | null;
  slug: string | null;
  status: string;
  gate: string;
  excerpt: string | null;
  updated_at: string;
  authors?: Array<{ id?: string; full_name?: string | null; email?: string | null }> | null;
}

interface ListResponse {
  items: ArticleRow[];
  total: number;
  limit: number;
  offset: number;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  scheduled: "bg-teal-50 text-teal-800 border-teal-200",
  published: "bg-emerald-50 text-emerald-800 border-emerald-200",
  unpublished: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-slate-200 text-slate-600 border-slate-300",
};

const GATE_LABEL: Record<string, string> = {
  public: "Public",
  subscribers: "Subscribers",
  plan_tier: "Plan tier",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", STATUS_BADGE[status] ?? "bg-slate-100 text-slate-700")}>
      {status}
    </Badge>
  );
}

function GateBadge({ gate }: { gate: string }) {
  return (
    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600 font-normal">
      {GATE_LABEL[gate] ?? gate}
    </Badge>
  );
}

function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const PAGE_SIZE = 20;

export default function AdminNewsletter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);
  const status = (searchParams.get("status") as StatusFilter) || "all";
  const gate = (searchParams.get("gate") as GateFilter) || "any";
  const initialQ = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(initialQ);
  const debouncedSearch = useDebounced(searchInput, 250);

  // Sync debounced search back into URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("q", debouncedSearch);
    else next.delete("q");
    // reset page when search changes
    if ((searchParams.get("q") ?? "") !== debouncedSearch) next.delete("page");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    setSearchParams(next);
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["newsletter-articles", { status, gate, search: debouncedSearch, page }],
    queryFn: async (): Promise<ListResponse> => {
      const { data, error } = await supabase.rpc("list_admin_newsletter_articles", {
        p_status_filter: status === "all" ? undefined : status,
        p_gate_filter: gate === "any" ? undefined : gate,
        p_search: debouncedSearch || undefined,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      const raw = (data ?? {}) as Record<string, unknown>;
      return {
        items: (raw.items as ArticleRow[]) ?? [],
        total: (raw.total as number) ?? 0,
        limit: (raw.limit as number) ?? PAGE_SIZE,
        offset: (raw.offset as number) ?? page * PAGE_SIZE,
      };
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const items = data?.items ?? [];
  const hasAnyFilter = status !== "all" || gate !== "any" || !!debouncedSearch;

  const [archiveTarget, setArchiveTarget] = useState<ArticleRow | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);

  const onArchive = async () => {
    if (!archiveTarget) return;
    if (archiveReason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters.");
      return;
    }
    setArchiving(true);
    const { error } = await supabase.rpc("archive_article", {
      p_article_id: archiveTarget.id,
      p_reason: archiveReason.trim(),
    });
    setArchiving(false);
    if (error) {
      toast.error(`Archive failed: ${error.message}`);
      return;
    }
    toast.success(`Archived "${archiveTarget.title ?? "Untitled"}"`);
    setArchiveTarget(null);
    setArchiveReason("");
    queryClient.invalidateQueries({ queryKey: ["newsletter-articles"] });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--bw-navy)]">Newsletter</h1>
          <p className="text-sm text-slate-500 mt-1">
            Articles, drafts, and scheduled posts
          </p>
        </div>
        <Button
          onClick={() => navigate("/super-admin/newsletter/new")}
          className="bg-[var(--bw-orange,#e85d3a)] hover:bg-[var(--bw-orange,#e85d3a)]/90 text-white"
        >
          <Plus className="h-4 w-4" /> New article
        </Button>
      </header>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
        <div className="relative w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title, excerpt, or slug"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => updateParam("status", v === "all" ? null : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All non-archived</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="unpublished">Unpublished</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gate} onValueChange={(v) => updateParam("gate", v === "any" ? null : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any gate</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="subscribers">Subscribers</SelectItem>
            <SelectItem value="plan_tier">Plan tier</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-slate-500">
          {isLoading ? "Loading…" : `${data?.total ?? 0} ${data?.total === 1 ? "article" : "articles"}`}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[120px]">Gate</TableHead>
              <TableHead className="w-[200px]">Authors</TableHead>
              <TableHead className="w-[140px]">Updated</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/3 mt-2" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                      <Newspaper className="h-7 w-7 text-slate-400" />
                    </div>
                    {hasAnyFilter ? (
                      <>
                        <p className="text-slate-600">No articles match your filters.</p>
                        <Button variant="outline" size="sm" onClick={() => {
                          setSearchInput("");
                          setSearchParams({});
                        }}>Clear filters</Button>
                      </>
                    ) : (
                      <>
                        <p className="text-slate-600">No articles yet. Start your first one.</p>
                        <Button onClick={() => navigate("/super-admin/newsletter/new")}>
                          <Plus className="h-4 w-4" /> New article
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-slate-50/60"
                  onClick={() => navigate(`/super-admin/newsletter/${item.id}`)}
                >
                  <TableCell>
                    <div className="font-medium text-slate-900">{item.title || "Untitled"}</div>
                    {item.slug && <div className="text-xs text-slate-400 mt-0.5">/{item.slug}</div>}
                  </TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell><GateBadge gate={item.gate} /></TableCell>
                  <TableCell>
                    <AuthorStack authors={item.authors ?? []} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {item.updated_at ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: true }) : "—"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/super-admin/newsletter/${item.id}`)}>
                          <ExternalLink className="h-4 w-4 mr-2" /> Open editor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!item.slug}
                          onClick={() => {
                            if (item.slug) {
                              navigator.clipboard.writeText(item.slug);
                              toast.success("Slug copied");
                            }
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" /> Copy slug
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={item.status === "archived"}
                          onClick={() => setArchiveTarget(item)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Archive className="h-4 w-4 mr-2" /> Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(data?.total ?? 0) > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || isFetching}
              onClick={() => updateParam("page", String(page - 1))}
            >Prev</Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages || isFetching}
              onClick={() => updateParam("page", String(page + 1))}
            >Next</Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) { setArchiveTarget(null); setArchiveReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive article?</AlertDialogTitle>
            <AlertDialogDescription>
              "{archiveTarget?.title ?? "Untitled"}" will be archived. This is permanent and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="archive-reason">Reason (required, min 10 chars)</Label>
            <Textarea
              id="archive-reason"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Why are you archiving this article?"
              rows={3}
            />
            <p className="text-xs text-slate-400">{archiveReason.trim().length}/10</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiving || archiveReason.trim().length < 10}
              onClick={(e) => { e.preventDefault(); onArchive(); }}
            >
              {archiving ? "Archiving…" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AuthorStack({ authors }: { authors: Array<{ id?: string; full_name?: string | null; email?: string | null }> }) {
  if (!authors || authors.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const visible = authors.slice(0, 3);
  const extra = authors.length - visible.length;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((a, i) => {
        const name = a.full_name || a.email || "?";
        const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
        return (
          <div
            key={a.id ?? i}
            title={name}
            className="h-7 w-7 rounded-full border-2 border-white bg-[var(--bw-navy)] text-white text-[10px] flex items-center justify-center font-semibold"
          >
            {initials}
          </div>
        );
      })}
      {extra > 0 && (
        <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-semibold">
          +{extra}
        </div>
      )}
    </div>
  );
}
