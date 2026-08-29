import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Msg = { role: "assistant" | "user"; content: string };

export default function BestDayInterview({
  dayPlanId,
  onFinish,
  generating,
}: {
  dayPlanId: string;
  onFinish: () => void;
  generating: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const opened = useRef(false);

  const turn = async (message: string) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("best-day-organizer", {
        body: { action: "turn", day_plan_id: dayPlanId, message },
      });
      if (error) {
        console.error("[best-day] turn failed", error);
        setFailed(true);
        return;
      }
      setFailed(false);
      const reply = (data as any)?.reply as string | undefined;
      if (reply) setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (typeof (data as any)?.exchanges_remaining === "number") {
        setRemaining((data as any).exchanges_remaining);
      }
      if ((data as any)?.done) setDone(true);
    } finally {
      setSending(false);
    }
  };


  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void turn("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayPlanId]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || done) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    await turn(text);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>A couple of quick questions</CardTitle>
        <Button variant="ghost" size="sm" onClick={onFinish} disabled={generating}>
          Skip to my plan
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-[380px] space-y-2 overflow-y-auto rounded-lg border p-3">
          {messages.length === 0 && sending && (
            <p className="text-sm text-muted-foreground">Getting started…</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm"
              }
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
        </div>

        {done ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">That is everything I need.</p>
            <Button onClick={onFinish} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              Build my day
            </Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Textarea
                rows={2}
                value={input}
                placeholder="Type your answer…"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button onClick={send} disabled={sending || !input.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              {remaining !== null ? (
                <span className="text-xs text-muted-foreground">{remaining} left</span>
              ) : (
                <span />
              )}
              <Button variant="outline" size="sm" onClick={onFinish} disabled={generating}>
                {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                Build my day now
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
