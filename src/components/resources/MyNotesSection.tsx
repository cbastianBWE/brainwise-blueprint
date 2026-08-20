import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Archive, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  const { data } = useQuery({
    queryKey: ["bw_my_learning_notes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("bw_my_learning_notes");
      if (error) throw error;
      return (data ?? []) as unknown as LearningNote[];
    },
  });

  const notes = data ?? [];
  if (notes.length === 0) return null;

  // The RPC already orders by cert path → curriculum → module → display order,
  // so group as we iterate rather than re-sorting.
  const groups: Array<{ key: string; heading: string; notes: LearningNote[] }> = [];
  for (const n of notes) {
    const parts = [
      n.certification_path_name,
      n.curriculum_name,
      n.module_name,
    ].filter((p): p is string => !!p && p.trim().length > 0);
    const heading = parts.length > 0 ? parts.join(" › ") : "Standalone items";
    const key = [
      n.certification_path_id ?? "-",
      n.curriculum_id ?? "-",
      n.module_id ?? "-",
    ].join("|");
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.notes.push(n);
    else groups.push({ key, heading, notes: [n] });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">My notes</h2>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.key} className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {g.heading}
            </div>
            <div className="space-y-2">
              {g.notes.map((n) => (
                <div key={n.note_id} className="rounded-lg border bg-card p-4 space-y-2">
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
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
