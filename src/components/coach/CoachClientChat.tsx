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
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [usedCredit, setUsedCredit] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [showNoSessionsNote, setShowNoSessionsNote] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setSending(true);

    let data: any = null;
    let error: any = null;
    try {
      const res = await supabase.functions.invoke("coach-client-chat", {
        body: {
          client_user_id: subjectUserId,
          question: text,
          history,
        },
      });
      data = res.data;
      error = res.error;
    } catch (e) {
      error = e;
    }
    setSending(false);

    if (data?.limit_reached) {
      toast.error(data.message || "You've reached your AI usage limit.");
      return;
    }

    if (error || !data || typeof data.message !== "string") {
      toast.error("The AI is unavailable right now.");
      return;
    }

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: data.message },
    ]);

    if (typeof data.coaching_remaining === "number") setRemaining(data.coaching_remaining);
    setUsedCredit(!!data.used_credit);
    if (!hasResponded) {
      setHasResponded(true);
      if (data.visible_sessions === 0) setShowNoSessionsNote(true);
    }
  };

  return (
    <div className="flex flex-col h-[600px] border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm text-muted-foreground">
          Ask the AI about {subjectName || "this client"}'s assessment results and coaching
          activities. Private to you as the practitioner.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Ask about patterns across their results, how to frame a debrief, or what they have
            written in their coaching work.
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
        {showNoSessionsNote && (
          <p className="text-xs text-muted-foreground text-center">
            This client's coaching work is not visible yet. It becomes visible when they accept the
            coach visibility disclosure or share an activity.
          </p>
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

      <div className="p-3 border-t border-border space-y-2">
        <div className="flex gap-2 items-end">
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
        {usedCredit ? (
          <p className="text-xs text-muted-foreground">
            That message came from your credit pack.
            {typeof remaining === "number" ? ` ${remaining} AI messages left this month.` : ""}
          </p>
        ) : typeof remaining === "number" ? (
          <p className="text-xs text-muted-foreground">
            {remaining} AI messages left this month.
          </p>
        ) : null}
      </div>
    </div>
  );
}
