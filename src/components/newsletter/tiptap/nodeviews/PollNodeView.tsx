import { useEffect, useRef, useState, useCallback } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Plus, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNewsletterEditorContext } from "@/components/newsletter/editor/NewsletterEditorContext";
import { cn } from "@/lib/utils";

type PollOption = { id: string; label: string };
type PollStyle = "buttons" | "bars";

interface PollRow {
  id: string;
  article_id: string;
  node_id: string;
  question: string;
  options: PollOption[];
  style: PollStyle;
  votes_visible: boolean;
  is_locked: boolean;
}

function makeOption(): PollOption {
  return { id: crypto.randomUUID(), label: "" };
}

export function PollNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { articleId } = useNewsletterEditorContext();
  const pollId = (node.attrs.poll_id as string | null) ?? null;
  const nodeIdRef = useRef<string>(crypto.randomUUID());

  // Placeholder when no article saved yet.
  if (!articleId) {
    return (
      <NodeViewWrapper
        as="div"
        data-drag-handle
        data-newsletter-poll-edit
        className="my-3"
      >
        <div
          className="relative rounded-2xl border border-dashed p-7 text-center"
          style={{
            background: "var(--bw-cream, #FBF7F1)",
            borderColor: selected ? "#F5741A" : "rgba(0,0,0,0.18)",
          }}
        >
          <span className="absolute right-3 top-3 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--fg-3)]">
            Preview only
          </span>
          <p className="m-0 text-sm text-[var(--fg-2)]">
            Save the article first to add a poll.
          </p>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <PollEditor
      key={pollId ?? "new"}
      pollId={pollId}
      articleId={articleId}
      nodeIdRef={nodeIdRef}
      selected={selected}
      onPollCreated={(id) => updateAttributes({ poll_id: id })}
      onDelete={() => deleteNode()}
    />
  );
}

function PollEditor({
  pollId,
  articleId,
  nodeIdRef,
  selected,
  onPollCreated,
  onDelete,
}: {
  pollId: string | null;
  articleId: string;
  nodeIdRef: React.MutableRefObject<string>;
  selected: boolean;
  onPollCreated: (id: string) => void;
  onDelete: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOption[]>([makeOption(), makeOption()]);
  const [style, setStyle] = useState<PollStyle>("buttons");
  const [votesVisible, setVotesVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(pollId === null);

  // Hydrate Path B
  useEffect(() => {
    if (!pollId) return;
    let cancelled = false;
    (async () => {
      const [rowRes, votesRes] = await Promise.all([
        supabase
          .from("newsletter_polls")
          .select("*")
          .eq("id", pollId)
          .maybeSingle(),
        supabase
          .from("newsletter_poll_votes")
          .select("poll_id", { count: "exact", head: true })
          .eq("poll_id", pollId),
      ]);
      if (cancelled) return;
      if (rowRes.error) {
        toast.error(`Failed to load poll: ${rowRes.error.message}`);
        return;
      }
      const row = rowRes.data as unknown as PollRow | null;
      if (!row) {
        toast.error("Poll not found in database.");
        return;
      }
      setQuestion(row.question);
      setOptions(
        (Array.isArray(row.options) ? row.options : []).map((o) => ({
          id: o.id,
          label: o.label,
        })),
      );
      setStyle(row.style);
      setVotesVisible(row.votes_visible);
      setIsLocked(row.is_locked);
      setVoteCount(votesRes.count ?? 0);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pollId]);

  // Debounced update_poll for Path B
  const debounceRef = useRef<number | null>(null);
  const lastSentRef = useRef<string>("");

  const scheduleUpdate = useCallback(
    (next: {
      q: string;
      opts: PollOption[];
      st: PollStyle;
      vv: boolean;
      lk: boolean;
    }) => {
      if (!pollId || !hydrated) return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        const payload = {
          p_poll_id: pollId,
          p_question: next.q.trim(),
          p_options: next.opts.map((o) => ({ id: o.id, label: o.label.trim() })),
          p_style: next.st,
          p_votes_visible: next.vv,
          p_is_locked: next.lk,
          p_reason: `Updated poll in newsletter article (article: ${articleId})`,
        };
        const sig = JSON.stringify(payload);
        if (sig === lastSentRef.current) return;
        lastSentRef.current = sig;
        setSaving(true);
        const { error } = await supabase.rpc("update_poll", payload);
        setSaving(false);
        if (error) {
          if (error.message?.includes("Cannot modify poll options after votes exist")) {
            toast.error(
              "Options can't be changed after votes are cast. Archive this poll and create a new one if needed.",
            );
            // refetch row to revert
            const { data } = await supabase
              .from("newsletter_polls")
              .select("options")
              .eq("id", pollId)
              .maybeSingle();
            const opts = (data as unknown as { options: PollOption[] } | null)?.options;
            if (opts) setOptions(opts.map((o) => ({ id: o.id, label: o.label })));
          } else {
            toast.error(`Save failed: ${error.message}`);
          }
        }
      }, 600);
    },
    [pollId, hydrated, articleId],
  );

  // Trigger updates when state changes (Path B only)
  useEffect(() => {
    if (!pollId || !hydrated) return;
    scheduleUpdate({ q: question, opts: options, st: style, vv: votesVisible, lk: isLocked });
  }, [pollId, hydrated, question, options, style, votesVisible, isLocked, scheduleUpdate]);

  const canCreate =
    question.trim().length > 0 &&
    options.filter((o) => o.label.trim().length > 0).length >= 2;

  const handleCreate = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("create_poll", {
      p_article_id: articleId,
      p_node_id: nodeIdRef.current,
      p_question: question.trim(),
      p_options: options
        .filter((o) => o.label.trim().length > 0)
        .map((o) => ({ id: o.id, label: o.label.trim() })),
      p_style: style,
      p_votes_visible: votesVisible,
      p_reason: `Created poll in newsletter article (article: ${articleId})`,
    });
    setSaving(false);
    if (error) {
      toast.error(`Create failed: ${error.message}`);
      return;
    }
    const newId = (data as unknown as { poll_id?: string } | null)?.poll_id;
    if (newId) onPollCreated(newId);
  };

  const optionsLocked = pollId !== null && voteCount > 0;

  return (
    <NodeViewWrapper
      as="div"
      data-drag-handle
      data-newsletter-poll-edit
      className="my-3"
    >
      <div
        className={cn(
          "rounded-2xl border p-5 transition-colors",
          "bg-[var(--bw-cream,#FBF7F1)]",
          selected ? "border-[#F5741A]" : "border-[var(--border-1,rgba(0,0,0,0.08))]",
        )}
      >
        {/* Pill bar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--fg-2)]">
            Poll
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-[var(--border-1,rgba(0,0,0,0.08))] bg-white p-0.5">
              {(["buttons", "bars"] as PollStyle[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
                    style === s
                      ? "bg-[#F5741A]/15 text-[#F5741A]"
                      : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--fg-2)]">
              <input
                type="checkbox"
                checked={votesVisible}
                onChange={(e) => setVotesVisible(e.target.checked)}
              />
              Show counts
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--fg-2)]">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
              />
              <Lock className="h-3 w-3" /> Lock
            </label>
            <button
              type="button"
              onClick={onDelete}
              title="Delete poll node"
              className="rounded p-1 text-[var(--fg-3)] hover:bg-white hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Question */}
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Poll question…"
          rows={2}
          className="mb-3 w-full resize-y rounded-md border border-[var(--border-1,rgba(0,0,0,0.08))] bg-white px-3 py-2 text-base font-semibold text-[var(--bw-navy)] focus:border-[#F5741A] focus:outline-none"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        />

        {/* Options */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
            Options
          </span>
          {optionsLocked && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--fg-2)]">
              Options locked — {voteCount} vote{voteCount === 1 ? "" : "s"} cast
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {options.map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-2">
              <input
                type="text"
                value={opt.label}
                disabled={optionsLocked}
                onChange={(e) => {
                  const next = [...options];
                  next[idx] = { ...opt, label: e.target.value };
                  setOptions(next);
                }}
                placeholder={`Option ${idx + 1}`}
                className="h-9 flex-1 rounded-md border border-[var(--border-1,rgba(0,0,0,0.08))] bg-white px-3 text-sm text-[var(--fg-1)] focus:border-[#F5741A] focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                disabled={optionsLocked || options.length <= 2}
                onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                className="rounded p-1.5 text-[var(--fg-3)] hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--fg-3)]"
                title="Remove option"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={optionsLocked || options.length >= 6}
          onClick={() => setOptions([...options, makeOption()])}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--border-1,rgba(0,0,0,0.15))] px-2.5 py-1 text-[11px] text-[var(--fg-2)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3 w-3" /> Add option
        </button>

        {/* Bottom row */}
        <div className="mt-4 flex items-center justify-between">
          {pollId === null ? (
            <button
              type="button"
              disabled={!canCreate || saving}
              onClick={handleCreate}
              className="rounded-md bg-[#F5741A] px-4 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create poll"}
            </button>
          ) : (
            <span className="text-[11px] text-[var(--fg-3)]">
              {saving ? "Saving…" : "Saved"}
            </span>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
