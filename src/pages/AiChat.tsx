import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAiUsage } from "@/hooks/useAiUsage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { MessageSquare, Send, Brain, Loader2, History, Save, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate } from "react-router-dom";
import UsageCounter from "@/components/ai/UsageCounter";
import LimitReached from "@/components/ai/LimitReached";
import CorpUsageCounter from "@/components/ai/CorpUsageCounter";
import { useAccountRole } from "@/lib/accountRoles";
import { Card, CardContent } from "@/components/ui/card";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO string for serialization
}

interface AssessmentOption {
  id: string;
  instrument_id: string;
  instrument_name: string;
  completed_at: string;
}

export default function AiChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { usage, loading: usageLoading, fetchUsage } = useAiUsage();

  const [tier, setTier] = useState("base");
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Init: fetch tier, usage, assessments, user name
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: userData } = await supabase
        .from("users")
        .select("subscription_tier, full_name")
        .eq("id", user.id)
        .single();
      const t = userData?.subscription_tier || "base";
      setTier(t);
      setUserName(userData?.full_name || "");
      await fetchUsage(t);

      const { data: results } = await supabase
        .from("assessment_results")
        .select("id, instrument_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (results && results.length > 0) {
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

        const options: AssessmentOption[] = results.map((r) => ({
          id: r.id,
          instrument_id: r.instrument_id || "",
          instrument_name: instrumentNames[r.instrument_id || ""] || r.instrument_id || "Assessment",
          completed_at: r.created_at,
        }));
        setAssessments(options);

        if (options.length > 0) {
          setSelectedIds([options[0].id]);
          const date = new Date(options[0].completed_at).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
          });
          const name = userData?.full_name?.split(" ")[0] || "there";
          setMessages([{
            role: "assistant",
            content: `Hi ${name}, I'm here to help you explore your assessment results. I can see your **${options[0].instrument_name}** results from **${date}**. What would you like to reflect on?`,
            timestamp: new Date().toISOString(),
          }]);
        }
      }
      setInitialLoading(false);
    };
    init();
  }, [user, fetchUsage]);

  // Save session to DB
  const saveSession = useCallback(async (
    currentMessages: ChatMessage[],
    currentSessionId: string | null,
    currentSelectedIds: string[],
    ended = false,
  ) => {
    if (!user) return currentSessionId;

    const messagesJson = currentMessages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
    const msgCount = currentMessages.filter((m) => m.role === "user").length;

    if (!currentSessionId) {
      // Create new session
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          assessment_result_ids: currentSelectedIds,
          messages: messagesJson,
          message_count: msgCount,
          ...(ended ? { ended_at: new Date().toISOString() } : {}),
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to create chat session:", error.message);
        return null;
      }
      return data?.id || null;
    } else {
      // Update existing session
      const updateData: any = {
        messages: messagesJson,
        message_count: msgCount,
      };
      if (ended) updateData.ended_at = new Date().toISOString();

      const { error } = await supabase
        .from("chat_sessions")
        .update(updateData)
        .eq("id", currentSessionId);

      if (error) {
        console.error("Failed to update chat session:", error.message);
      }
      return currentSessionId;
    }
  }, [user]);

  // Save on unmount (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId && messages.length > 1) {
        // Use navigator.sendBeacon or just rely on the existing saved state
        // The session is already saved after each exchange
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionId, messages]);

  const toggleAssessment = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending) return;
    const userMsg = message.trim();
    setMessage("");
    setSending(true);

    const newUserMsg: ChatMessage = { role: "user", content: userMsg, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: userMsg,
          conversation_history: history,
          assessment_result_ids: selectedIds,
          subscription_tier: tier,
        },
      });

      if (error) throw new Error(error.message || "Failed to get response");

      if (data?.error) {
        if (data.limit_reached) {
          await fetchUsage(tier);
          toast.error(data.error);
          setSending(false);
          return;
        }
        throw new Error(data.error);
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      const allMessages = [...updatedMessages, assistantMsg];
      setMessages(allMessages);

      // Auto-save session
      const newSessionId = await saveSession(allMessages, sessionId, selectedIds);
      if (newSessionId) setSessionId(newSessionId);

      if (data.usage) await fetchUsage(tier);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
      setMessage(userMsg);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [message, sending, messages, selectedIds, tier, fetchUsage, saveSession, sessionId]);

  const handleEndChat = async () => {
    if (messages.length > 1) {
      await saveSession(messages, sessionId, selectedIds, true);
    }
    toast.success("Conversation saved!");
    navigate("/ai-chat/history");
  };

  const limitReached = usage && !usage.allowed;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> AI Chat
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reflect on your assessment results
          </p>
        </div>
        <div className="flex items-center gap-3">
          {usage && !limitReached && (
            <div className="w-48">
              <UsageCounter currentCount={usage.current_count} limit={usage.limit} />
            </div>
          )}
          <Link
            to="/ai-chat/history"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Chat History</span>
          </Link>
        </div>
      </div>

      {/* Assessment context selector */}
      {assessments.length > 0 && (
        <div className="mb-3 p-3 rounded-lg border bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground mb-2">Assessment context:</p>
          <div className="flex flex-wrap gap-3">
            {assessments.map((a) => {
              const date = new Date(a.completed_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              });
              return (
                <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedIds.includes(a.id)}
                    onCheckedChange={() => toggleAssessment(a.id)}
                  />
                  <span>{a.instrument_name} — {date}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat area */}
      <ScrollArea className="flex-1 border rounded-lg bg-background mb-3">
        <div className="p-4 space-y-4 min-h-[300px]">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <MessageSquare className="h-12 w-12 opacity-30 mb-2" />
              <p className="text-sm">No assessments found. Complete an assessment to start chatting.</p>
            </div>
          )}

          {messages.map((msg, i) => (
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
                  <p className={`text-[10px] text-muted-foreground mt-1 ${msg.role === "user" ? "text-right" : ""}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input area or limit card */}
      {limitReached ? (
        <LimitReached limit={usage.limit} tier={usage.tier || tier} />
      ) : (
        <div className="space-y-2">
          {/* End & Save button */}
          {messages.length > 1 && (
            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Save className="h-3.5 w-3.5" /> End & Save Chat
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End this conversation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will save your conversation and end this session. You can view it in your Chat History.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndChat}>Save & End</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="Ask about your results..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="resize-none"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !message.trim() || usageLoading}
              className="self-end"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
