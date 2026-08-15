import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Loader2, MessageCircle, Send } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function ReportChatPanel({
  reportType,
  reportId,
}: {
  reportType: "team" | "paired";
  reportId: string | undefined;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  if (!reportId) return null;

  const helper =
    reportType === "team"
      ? "Answers describe the team as a whole. The report is anonymous, so it cannot identify individual members."
      : "Answers cover both of you, since you can both already see the whole report.";

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setErrorMsg(null);
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    const { data, error } = await supabase.functions.invoke("report-chat", {
      body: { report_type: reportType, report_id: reportId, message: text, history },
    });
    setSending(false);

    const status = (error as any)?.context?.status;
    const code = (data as any)?.error;

    if (error || code) {
      // restore the typed message so it is not lost
      setInput(text);
      setMessages((prev) => prev.slice(0, -1));
      if (status === 402 || code === "chat_limit_reached") {
        setErrorMsg(
          "You have no AI messages remaining. Your practitioner can help, or you can upgrade for more."
        );
      } else if (status === 403 || code === "access_denied") {
        setErrorMsg("You do not have access to this report.");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
      return;
    }

    setMessages((prev) => [...prev, { role: "assistant", content: (data as any).answer }]);
    const rem = (data as any)?.chat_remaining;
    setRemaining(typeof rem === "number" ? rem : null);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageCircle className="h-4 w-4 mr-2" />
          Ask about this report
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b border-border text-left">
          <SheetTitle>Ask about this report</SheetTitle>
          <SheetDescription>{helper}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Try: what should we focus on first?
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground whitespace-pre-wrap"
                      : "max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted whitespace-pre-wrap"
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

        {errorMsg && (
          <p className="px-4 pb-2 text-sm text-destructive">{errorMsg}</p>
        )}

        <div className="border-t border-border p-3">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              placeholder="Ask a question..."
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
          {remaining !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              {remaining} questions left this month
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ReportChatPanel;
