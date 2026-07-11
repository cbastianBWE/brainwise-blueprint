import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function CoachClientChat({
  subjectUserId,
  subjectName,
}: {
  subjectUserId: string;
  subjectName?: string | null;
}) {
  const [assessmentIds, setAssessmentIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCtx(true);
      const { data } = await supabase
        .from("assessment_results")
        .select("id, created_at")
        .eq("user_id", subjectUserId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setAssessmentIds(((data as any[]) ?? []).map((r) => r.id));
      setLoadingCtx(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectUserId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);
    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: {
        message: text,
        conversation_history: history,
        assessment_result_ids: assessmentIds,
        subject_user_id: subjectUserId,
      },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast.error(
        (data as any)?.limit_reached
          ? "You've reached your AI usage limit."
          : ((data as any)?.error || error?.message || "The AI is unavailable right now.")
      );
      return;
    }
    setMessages((prev) => [...prev, { role: "assistant", content: (data as any).response }]);
  };

  return (
    <div className="flex flex-col h-[600px] border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm text-muted-foreground">
          Ask the AI about {subjectName || "this client"}'s results. Private to you as the coach.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingCtx ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {assessmentIds.length === 0
              ? "This client has no completed assessments yet, but you can still ask general coaching questions."
              : "Ask about patterns across their results, how to frame a debrief, or where to focus a coaching conversation."}
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground whitespace-pre-wrap"
                    : "max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 bg-muted">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 items-end p-3 border-t border-border">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          placeholder="Ask about this client..."
          rows={2}
          className="flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button onClick={send} disabled={sending || !input.trim()} className="self-end">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
