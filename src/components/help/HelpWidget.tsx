import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LifeBuoy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const PANEL_ID = "bw-help-panel";

type BotSource = { guide_id: string; guide_title: string; role: string };

type BotAnswer = {
  answered: boolean;
  message: string;
  sources?: BotSource[];
  offer_report: boolean;
};

type ReportRow = {
  ticket_id: string;
  title?: string | null;
  status: string;
  unread_from_us?: boolean | null;
  created_at?: string | null;
};

type ThreadRow = { author_kind: string; body: string; created_at: string };

type View = "ask" | "answer" | "report" | "reports" | "thread";

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
          {para}
        </p>
      ))}
    </>
  );
}

function authorLabel(kind: string) {
  if (kind === "user") return "You";
  if (kind === "agent") return "BrainWise Help";
  if (kind === "staff") return "BrainWise";
  return "";
}

export default function HelpWidget() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("ask");

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<BotAnswer | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");

  const [reportText, setReportText] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const reportRef = useRef<HTMLTextAreaElement | null>(null);

  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadRow[] | null>(null);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

  const loadReports = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)("bw_my_reports");
    if (error) return null;
    const rows = (Array.isArray(data) ? data : []) as ReportRow[];
    setReports(rows);
    setHasUnread(rows.some((r) => r.unread_from_us));
    return rows;
  }, []);

  // Unread check while closed: at most every 5 minutes, only when tab is visible.
  useEffect(() => {
    if (!user || open) return;
    let cancelled = false;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      (supabase.rpc as any)("bw_my_reports").then(({ data, error }: any) => {
        if (cancelled || error) return;
        const rows = (Array.isArray(data) ? data : []) as ReportRow[];
        setHasUnread(rows.some((r) => r.unread_from_us));
      });
    };
    check();
    const id = window.setInterval(check, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user, open]);

  // Poll the report list only while the panel is open.
  useEffect(() => {
    if (!open) return;
    loadReports();
    const id = window.setInterval(() => {
      loadReports();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [open, loadReports]);


  const goHelp = () => {
    setOpen(false);
    navigate("/help");
  };

  const ask = async () => {
    const q = question.trim();
    if (q.length < 3 || asking) return;
    setAsking(true);
    setLastQuestion(q);
    try {
      const { data, error } = await supabase.functions.invoke("support-bot", {
        body: { question: q, route: window.location.pathname },
      });
      if (error) {
        const status = (error as any)?.status ?? (error as any)?.context?.status;
        if (status === 401) {
          setAnswer({
            answered: false,
            message: "Your session has expired. Please reload the page and sign in again.",
            offer_report: false,
          });
        } else if (status === 429) {
          setAnswer({
            answered: false,
            message:
              "You have asked a lot of questions in the last hour. Please try again shortly.",
            offer_report: false,
          });
        } else {
          setAnswer({
            answered: false,
            message: "Something went wrong.",
            offer_report: true,
          });
        }
        setView("answer");
        return;
      }
      const res = data as BotAnswer;
      setAnswer({
        answered: !!res?.answered,
        message: res?.message ?? "Something went wrong.",
        sources: res?.sources ?? [],
        offer_report: !!res?.offer_report,
      });
      setView("answer");
    } catch {
      setAnswer({
        answered: false,
        message: "I could not reach the server. Check your connection and try again.",
        offer_report: false,
      });
      setView("answer");
    } finally {
      setAsking(false);
    }
  };

  const openReport = () => {
    setReportText(`${lastQuestion}\n\n`);
    setView("report");
    setTimeout(() => {
      const el = reportRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }, 50);
  };

  const sendReport = async () => {
    const body = reportText.trim();
    if (!body || sendingReport) return;
    setSendingReport(true);
    let filed = false;
    try {
      const { data, error } = await (supabase.rpc as any)("bw_report_issue", {
        p_body: body,
        p_route: window.location.pathname,
        p_context: { viewport: `${window.innerWidth}x${window.innerHeight}` },
      });
      if (error) {
        toast.error("Something went wrong. Please try again.");
        return;
      }
      const res = data as any;
      if (res?.error) {
        const map: Record<string, string> = {
          daily_limit: "You have sent a lot of reports today. Please try again tomorrow.",
          too_long: "That is too long. Please shorten it.",
        };
        toast.error(res.detail || map[res.error] || "Something went wrong.");
        return;
      }
      filed = true;
      toast.success("Sent.");
      setReportText("");
      setQuestion("");
      setAnswer(null);
      await loadReports();
      setView("reports");
    } catch {
      toast.error(
        filed
          ? "Sent, but the list did not refresh. Reopen Your reports to see it."
          : "Could not send. Check your connection and try again.",
      );
    } finally {
      setSendingReport(false);
    }
  };


  const openThread = async (ticketId: string) => {
    setActiveTicket(ticketId);
    setThread(null);
    setView("thread");
    const { data, error } = await (supabase.rpc as any)("bw_report_thread", {
      p_ticket_id: ticketId,
    });
    if (error) {
      setThread([]);
      return;
    }
    setThread((Array.isArray(data) ? data : []) as ThreadRow[]);
    loadReports();
  };

  const sendReply = async () => {
    const body = reply.trim();
    if (!body || !activeTicket || replying) return;
    setReplying(true);
    try {
      const { data, error } = await (supabase.rpc as any)("bw_post_report_message", {
        p_ticket_id: activeTicket,
        p_body: body,
      });
      if (error) {
        toast.error("Something went wrong. Please try again.");
        return;
      }
      const res = data as any;
      if (res?.error) {
        toast.error(
          res.detail ||
            (res.error === "slow_down"
              ? "You are sending replies quickly. Please wait a moment."
              : "Something went wrong."),
        );
        return;
      }
      setReply("");
      await openThread(activeTicket);
    } catch {
      toast.error("Could not send. Check your connection and try again.");
    } finally {
      setReplying(false);
    }
  };

  if (loading || !user) return null;

  const activeReport = reports?.find((r) => r.ticket_id === activeTicket);
  const threadClosed =
    !!activeReport && (activeReport.status === "resolved" || activeReport.status === "dismissed");

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={hasUnread ? "Help, unread reply" : "Help"}
              aria-expanded={open}
              aria-controls={PANEL_ID}
              aria-haspopup="dialog"
              className="fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <LifeBuoy className="h-5 w-5" aria-hidden />
              {hasUnread && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive border-2 border-background"
                  aria-hidden
                />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Help</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent id={PANEL_ID} side="right" hideOverlay className="z-40 p-0 sm:max-w-md">
          <div className="flex h-full flex-col gap-0">
          <SheetHeader className="p-6 pb-4 border-b">

            <SheetTitle>Help</SheetTitle>
            <SheetDescription>Ask about anything in BrainWise.</SheetDescription>
            <div className="pt-2">
              <button
                type="button"
                className="text-sm underline text-muted-foreground hover:text-foreground"
                onClick={() => {
                  loadReports();
                  setView(view === "reports" || view === "thread" ? "ask" : "reports");
                }}
              >
                {view === "reports" || view === "thread" ? "Ask a question" : "Your reports"}
              </button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              {view === "ask" && (
                <div className="space-y-3">
                  <Textarea
                    rows={3}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        ask();
                      }
                    }}
                    placeholder="What do you need help with?"
                    aria-label="Your question"
                    disabled={asking}
                  />
                  <Button onClick={ask} disabled={asking || question.trim().length < 3}>
                    {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>Send</span>
                  </Button>
                  <div aria-live="polite" aria-busy={asking} className="min-h-[1rem]">
                    {asking && <span className="sr-only">Thinking…</span>}
                  </div>
                </div>
              )}

              {view === "answer" && answer && (
                <div className="space-y-4">
                  <div aria-live="polite" className="space-y-3">
                    <Paragraphs text={answer.message} />
                  </div>

                  {answer.answered && !!answer.sources?.length && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {answer.sources.map((s) => (
                          <button key={s.guide_id} type="button" onClick={goHelp}>
                            <Badge variant="secondary">{s.guide_title}</Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm font-medium">Did this help?</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAnswer(null);
                          setQuestion("");
                          setView("ask");
                        }}
                      >
                        Yes, thanks
                      </Button>
                      <Button variant="secondary" size="sm" onClick={openReport}>
                        No, send this to a person
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {view === "report" && (
                <div className="space-y-3">
                  <Textarea
                    ref={reportRef}
                    rows={6}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    aria-label="Your message"
                    disabled={sendingReport}
                  />
                  <p className="text-xs text-muted-foreground">
                    A person will read this. You will get a reply in this panel.
                  </p>
                  <Button onClick={sendReport} disabled={sendingReport || !reportText.trim()}>
                    {sendingReport ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>Send</span>
                  </Button>
                </div>
              )}

              {view === "reports" && (
                <div className="space-y-2">
                  {!reports && <p className="text-sm text-muted-foreground">Loading…</p>}
                  {reports?.length === 0 && (
                    <p className="text-sm text-muted-foreground">You have not sent any reports.</p>
                  )}
                  {reports?.map((r) => (
                    <button
                      key={r.ticket_id}
                      type="button"
                      onClick={() => openThread(r.ticket_id)}
                      className="w-full text-left rounded-md border p-3 hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium line-clamp-1">
                          {r.title || "Report"}
                        </span>
                        {r.unread_from_us && (
                          <span
                            className="h-2 w-2 rounded-full bg-destructive shrink-0"
                            aria-label="Unread reply"
                          />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{r.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {view === "thread" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    className="text-sm underline text-muted-foreground hover:text-foreground"
                    onClick={() => setView("reports")}
                  >
                    ← All reports
                  </button>
                  {!thread && <p className="text-sm text-muted-foreground">Loading…</p>}
                  <div className="space-y-3">
                    {thread?.map((m, i) =>
                      m.author_kind === "system" ? (
                        <p key={i} className="text-xs text-center text-muted-foreground">
                          {m.body}
                        </p>
                      ) : (
                        <div
                          key={i}
                          className={cn(
                            "rounded-md border p-3",
                            m.author_kind === "user" ? "bg-muted/40" : "bg-background",
                          )}
                        >
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {authorLabel(m.author_kind)}
                          </p>
                          <Paragraphs text={m.body} />
                        </div>
                      ),
                    )}
                  </div>

                  {threadClosed ? (
                    <p className="text-sm text-muted-foreground border-t pt-3">
                      This report is closed. Start a new one if you still need help.
                    </p>
                  ) : (
                    <div className="space-y-2 border-t pt-3">
                      <Textarea
                        rows={3}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        aria-label="Your reply"
                        disabled={replying}
                      />
                      <Button size="sm" onClick={sendReply} disabled={replying || !reply.trim()}>
                        {replying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        <span>Send</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <button
              type="button"
              onClick={goHelp}
              className="text-sm text-primary underline underline-offset-2"
            >
              Browse all help guides →
            </button>
          </div>
          </div>
        </SheetContent>

      </Sheet>
    </>
  );
}
