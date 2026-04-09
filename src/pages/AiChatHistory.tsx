import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { History, MessageSquare, Brain, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Json } from "@/integrations/supabase/types";

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  assessment_result_ids: string[];
  messages: StoredMessage[];
  message_count: number | null;
  started_at: string;
  ended_at: string | null;
  instrumentNames?: string[];
}

export default function AiChatHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (error) {
        console.error("Failed to load chat history:", error.message);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      // Collect all assessment_result_ids to resolve instrument names
      const allResultIds = [...new Set(data.flatMap((s) => s.assessment_result_ids))];
      let resultInstrumentMap: Record<string, string> = {};

      if (allResultIds.length > 0) {
        const { data: results } = await supabase
          .from("assessment_results")
          .select("id, instrument_id")
          .in("id", allResultIds);

        if (results) {
          const instrumentIds = [...new Set(results.map((r) => r.instrument_id).filter(Boolean))];
          let instrumentNames: Record<string, string> = {};
          if (instrumentIds.length > 0) {
            const { data: instruments } = await supabase
              .from("instruments")
              .select("instrument_id, instrument_name")
              .in("instrument_id", instrumentIds);
            if (instruments) {
              for (const inst of instruments) {
                instrumentNames[inst.instrument_id] = inst.instrument_name;
              }
            }
          }
          for (const r of results) {
            if (r.instrument_id) {
              resultInstrumentMap[r.id] = instrumentNames[r.instrument_id] || r.instrument_id;
            }
          }
        }
      }

      const enriched: ChatSession[] = data.map((s) => {
        const msgs = parseMessages(s.messages);
        const names = [...new Set(s.assessment_result_ids.map((rid: string) => resultInstrumentMap[rid]).filter(Boolean))];
        return {
          id: s.id,
          assessment_result_ids: s.assessment_result_ids,
          messages: msgs,
          message_count: s.message_count,
          started_at: s.started_at,
          ended_at: s.ended_at,
          instrumentNames: names,
        };
      });

      setSessions(enriched);
      setLoading(false);
    };
    load();
  }, [user]);

  function parseMessages(json: Json): StoredMessage[] {
    if (!Array.isArray(json)) return [];
    return json.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || ""),
      timestamp: String(m.timestamp || ""),
    }));
  }

  function formatDuration(startedAt: string, endedAt: string | null): string {
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const mins = Math.round((end - start) / 60000);
    if (mins < 1) return "< 1 min";
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" /> Chat History
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review your past AI chat conversations
          </p>
        </div>
        <Link to="/ai-chat">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> New Chat
          </Button>
        </Link>
      </div>

      {/* Sessions */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No saved conversations yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start a chat to begin exploring your results.
            </p>
            <Link to="/ai-chat" className="mt-4">
              <Button size="sm">Start a Chat</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isExpanded = expandedId === session.id;
            const startDate = new Date(session.started_at);
            const dateStr = startDate.toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            });
            const timeStr = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const userMsgCount = session.messages.filter((m) => m.role === "user").length;

            return (
              <Card key={session.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {dateStr} at {timeStr}
                      </p>
                      {session.instrumentNames && session.instrumentNames.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {session.instrumentNames.join(", ")}
                        </p>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{userMsgCount} message{userMsgCount !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>{formatDuration(session.started_at, session.ended_at)}</span>
                        {!session.ended_at && (
                          <>
                            <span>·</span>
                            <span className="text-amber-500">In progress</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {isExpanded ? "Hide" : "View"}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded conversation */}
                  {isExpanded && (
                    <div className="border-t">
                      <ScrollArea className="max-h-[500px]">
                        <div className="p-4 space-y-4">
                          {session.messages.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div className={`flex gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                {msg.role === "assistant" && (
                                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                                    <Brain className="h-4 w-4 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <div
                                    className={`rounded-2xl px-4 py-2.5 text-sm ${
                                      msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground"
                                    }`}
                                  >
                                    {msg.role === "assistant" ? (
                                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                      </div>
                                    ) : (
                                      msg.content
                                    )}
                                  </div>
                                  {msg.timestamp && (
                                    <p className={`text-[10px] text-muted-foreground mt-1 ${msg.role === "user" ? "text-right" : ""}`}>
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
