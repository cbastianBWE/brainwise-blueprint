import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Archive, Search, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LearningNote {
  note_id: string;
  content_item_id: string;
  content_item_title: string;
  item_type: string;
  module_id: string | null;
  module_name: string | null;
  curriculum_id: string | null;
  curriculum_name: string | null;
  certification_path_id: string | null;
  certification_path_name: string | null;
  body: string;
  is_shared: boolean;
  shared_at: string | null;
  item_archived: boolean;
  created_at: string;
  updated_at: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function NoteBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = body.length > 240 || body.split(/\r?\n/).length > 4;
  return (
    <div className="space-y-1">
      <p
        className={cn(
          "whitespace-pre-wrap text-sm text-foreground/90",
          !expanded && isLong && "line-clamp-4",
        )}
      >
        {body}
      </p>
      {isLong && (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
    </div>
  );
}

export default function MyNotesSection() {
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["bw_my_learning_notes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("bw_my_learning_notes");
      if (error) throw error;
      return (data ?? []) as unknown as LearningNote[];
    },
  });

  const notes = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      [n.body, n.content_item_title, n.module_name ?? ""]
        .join(" \u0000 ")
        .toLowerCase()
        .includes(q),
    );
  }, [notes, search]);

  // The RPC already orders by cert path → curriculum → module → display order,
  // so group as we iterate rather than re-sorting.
  const parents = useMemo(() => {
    const out: Array<{
      key: string;
      heading: string;
      groups: Array<{ key: string; heading: string; notes: LearningNote[] }>;
    }> = [];
    for (const n of filtered) {
      const parentKey = [
        n.certification_path_id ?? "-",
        n.curriculum_id ?? "-",
      ].join("|");
      const parentHeading =
        [n.certification_path_name, n.curriculum_name]
          .filter((p): p is string => !!p && p.trim().length > 0)
          .join(" › ") || "Standalone items";
      let parent = out[out.length - 1];
      if (!parent || parent.key !== parentKey) {
        parent = { key: parentKey, heading: parentHeading, groups: [] };
        out.push(parent);
      }
      const groupKey = `${parentKey}|${n.module_id ?? "-"}`;
      const groupHeading =
        n.module_name && n.module_name.trim().length > 0
          ? n.module_name
          : "Standalone items";
      const last = parent.groups[parent.groups.length - 1];
      if (last && last.key === groupKey) last.notes.push(n);
      else parent.groups.push({ key: groupKey, heading: groupHeading, notes: [n] });
    }
    return out;
  }, [filtered]);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">My notes</h2>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Notes you take while working through a module appear here, gathered in one
          place across your whole learning journey.
        </p>
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your notes"
              className="pl-9"
              aria-label="Search your notes"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notes match “{search.trim()}”.
            </p>
          ) : (
            <div className="space-y-6">
              {parents.map((p) => (
                <div key={p.key} className="space-y-3">
                  <div className="text-sm font-medium text-foreground">{p.heading}</div>
                  {p.groups.map((g) => (
                    <div key={g.key} className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {g.heading}
                      </div>
                      <div className="space-y-2">
                        {g.notes.map((n) => (
                          <div
                            key={n.note_id}
                            className="rounded-lg border bg-card p-4 space-y-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/learning/content-item/${n.content_item_id}`}
                                className="text-sm font-medium text-foreground hover:underline"
                              >
                                {n.content_item_title}
                              </Link>
                              {n.is_shared && (
                                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                                  <Share2 className="h-3 w-3" /> Shared with mentor
                                </span>
                              )}
                              {n.item_archived && (
                                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                                  <Archive className="h-3 w-3" /> No longer active
                                </span>
                              )}
                            </div>
                            <NoteBody body={n.body} />
                            <p className="text-[11px] text-muted-foreground">
                              Last updated {formatDate(n.updated_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
