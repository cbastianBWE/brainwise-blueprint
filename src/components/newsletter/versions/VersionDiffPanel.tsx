import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { diffWords } from "diff";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Info, Loader2, RotateCcw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { CurrentDraft, VersionFull } from "./types";
import { VERSION_TYPE_BADGE, VERSION_TYPE_LABEL } from "./versionBadgeStyles";
import { tipTapDocToPlainText } from "./tipTapDocToPlainText";
import RestoreVersionDialog from "./RestoreVersionDialog";

interface VersionDiffPanelProps {
  versionId: string;
  articleId: string;
  currentDraft: CurrentDraft;
  onRestored: () => void;
}

interface DiffChunk {
  value: string;
  added?: boolean;
  removed?: boolean;
}

function renderInlineDiff(chunks: DiffChunk[]) {
  return chunks.map((c, i) => {
    if (c.added) {
      return (
        <span key={i} className="bg-emerald-50 text-emerald-900 px-0.5 rounded-sm">
          {c.value}
        </span>
      );
    }
    if (c.removed) {
      return (
        <span key={i} className="bg-rose-50 text-rose-900 line-through px-0.5 rounded-sm">
          {c.value}
        </span>
      );
    }
    return <span key={i}>{c.value}</span>;
  });
}

export default function VersionDiffPanel({
  versionId,
  articleId,
  currentDraft,
  onRestored,
}: VersionDiffPanelProps) {
  const [restoreOpen, setRestoreOpen] = useState(false);

  const { data: version, isLoading } = useQuery({
    queryKey: ["newsletter-article-version", versionId],
    enabled: !!versionId,
    queryFn: async (): Promise<VersionFull | null> => {
      const { data, error } = await supabase.rpc("get_article_version", {
        p_version_id: versionId,
      });
      if (error) throw error;
      return (data as unknown as VersionFull) ?? null;
    },
  });

  const titleDiff = useMemo(() => {
    if (!version) return null;
    return diffWords(version.title_snapshot ?? "", currentDraft.title);
  }, [version, currentDraft.title]);

  const excerptDiff = useMemo(() => {
    if (!version) return null;
    return diffWords(version.excerpt_snapshot ?? "", currentDraft.excerpt);
  }, [version, currentDraft.excerpt]);

  const bodyDiff = useMemo(() => {
    if (!version) return null;
    const oldText = tipTapDocToPlainText(version.body_tiptap);
    const newText = tipTapDocToPlainText(currentDraft.body_tiptap);
    return diffWords(oldText, newText);
  }, [version, currentDraft.body_tiptap]);

  const allIdentical =
    !!titleDiff && !!excerptDiff && !!bodyDiff &&
    [titleDiff, excerptDiff, bodyDiff].every((d) => d.every((c) => !c.added && !c.removed));

  if (isLoading || !version) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const versionLabel = version.version_name || (version.version_type === "draft" ? "Draft auto-save" : `v${version.version_number}`);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 border-l border-slate-200 bg-white">
      {/* Header strip */}
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-base truncate">{versionLabel}</h3>
            <Badge variant="outline" className={VERSION_TYPE_BADGE[version.version_type]}>
              {VERSION_TYPE_LABEL[version.version_type]}
            </Badge>
            <span className="text-xs text-slate-400">v{version.version_number}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Created {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })} by{" "}
            {version.created_by_display_name ?? "Unknown"}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setRestoreOpen(true)}
          className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white shrink-0"
        >
          <RotateCcw className="h-4 w-4" />
          Restore this version
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {/* Caveat banner */}
        <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 flex items-start gap-2 sticky top-0 z-10">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed">
            Text-only diff. Structural changes — callouts, embeds, two-column layouts, key moments — may not appear here.
            Restore creates a full structural copy of this version.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {allIdentical && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
              <p>These versions are identical</p>
            </div>
          )}

          {!allIdentical && (
            <>
              <DiffSection label="Title" chunks={titleDiff} fallback={version.title_snapshot ?? ""} />
              <DiffSection label="Excerpt" chunks={excerptDiff} fallback={version.excerpt_snapshot ?? ""} />

              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Body</h4>
                <div className="newsletter-prose text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                  {bodyDiff && bodyDiff.every((c) => !c.added && !c.removed) ? (
                    <span className="text-slate-400 italic">Body unchanged</span>
                  ) : (
                    bodyDiff && renderInlineDiff(bodyDiff)
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </ScrollArea>

      {restoreOpen && (
        <RestoreVersionDialog
          version={version}
          articleId={articleId}
          open={restoreOpen}
          onOpenChange={setRestoreOpen}
          onRestored={onRestored}
        />
      )}
    </div>
  );
}

function DiffSection({
  label,
  chunks,
  fallback,
}: {
  label: string;
  chunks: DiffChunk[] | null;
  fallback: string;
}) {
  if (!chunks) return null;
  const changed = chunks.some((c) => c.added || c.removed);
  return (
    <section className="space-y-2">
      <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{label}</h4>
      {changed ? (
        <div className="text-[15px] leading-relaxed break-words">{renderInlineDiff(chunks)}</div>
      ) : (
        <div className="text-sm text-slate-400 italic">
          {label} unchanged{fallback ? `: ${fallback}` : ""}
        </div>
      )}
    </section>
  );
}

// Silence unused Loader2 import warning in some builds
void Loader2;
