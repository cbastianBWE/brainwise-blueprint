import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAiUsage } from "@/hooks/useAiUsage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { MessageSquare, Send, Loader2, History, Save, AlertTriangle, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import UsageCounter from "@/components/ai/UsageCounter";
import LimitReached from "@/components/ai/LimitReached";
import CorpUsageCounter from "@/components/ai/CorpUsageCounter";
import { useAccountRole } from "@/lib/accountRoles";
import { Card, CardContent } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AssessmentOption {
  id: string;
  instrument_id: string;
  instrument_name: string;
  completed_at: string;
  owner_label: string; // "You" or peer display name
  user_id: string;
  is_peer: boolean;
}

interface Peer {
  user_id: string;
  full_name: string | null;
  email: string;
  department_id: string | null;
  department_name: string | null;
  supervisor_user_id: string | null;
  org_level: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AiChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { usage, loading: usageLoading, fetchUsage } = useAiUsage();
  const { isCorp, isCompanyAdmin, isOrgAdmin, isSuperAdmin } = useAccountRole();

  const [corpUsage, setCorpUsage] = useState<{
    ai_chat_enabled: boolean;
    chat_allowance: number;
    chat_used: number;
    chat_remaining: number;
  } | null>(null);

  const fetchCorpUsage = useCallback(async () => {
    if (!user || !isCorp) return;
    const { data, error } = await supabase.rpc("user_effective_allowances", {
      p_user: user.id,
    });
    if (error || !data) return;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;
    setCorpUsage({
      ai_chat_enabled: row.ai_chat_enabled,
      chat_allowance: row.chat_allowance_per_user ?? 0,
      chat_used: row.chat_used_this_month ?? 0,
      chat_remaining: row.chat_remaining ?? 0,
    });
  }, [user, isCorp]);

  useEffect(() => {
    if (isCorp) fetchCorpUsage();
  }, [isCorp, fetchCorpUsage]);

  // ── Core chat state ──────────────────────────────────────────────────────
  const [tier, setTier] = useState<string>("base");
  const [message, setMessage] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allAssessments, setAllAssessments] = useState<AssessmentOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ── Peer sidebar state ───────────────────────────────────────────────────
  const [peerInstrument, setPeerInstrument] = useState<"INST-001" | "INST-003">("INST-001");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loadingPeers, setLoadingPeers] = useState<boolean>(false);
  const [peerSearch, setPeerSearch] = useState<string>("");
  const [selectedPeerIds, setSelectedPeerIds] = useState<Set<string>>(new Set());
  const [peerAssessments, setPeerAssessments] = useState<AssessmentOption[]>([]);
  const [isAirsaEligible, setIsAirsaEligible] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Determine AIRSA eligibility ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (isCompanyAdmin || isOrgAdmin || isSuperAdmin) {
      setIsAirsaEligible(true);
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("org_users_public")
        .select("id")
        .eq("supervisor_user_id", user.id)
        .limit(1);
      setIsAirsaEligible((data ?? []).length > 0);
    })();
  }, [user, isCompanyAdmin, isOrgAdmin, isSuperAdmin]);

  // ── Load peers when instrument changes ──────────────────────────────────
  useEffect(() => {
    if (!user || !isCorp) return;
    setLoadingPeers(true);
    setPeers([]);
    setSelectedPeerIds(new Set());
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_accessible_peer_results", {
        p_instrument: peerInstrument,
      });
      if (!error) setPeers((data as Peer[]) ?? []);
      setLoadingPeers(false);
    })();
  }, [user, isCorp, peerInstrument]);

  // ── Load peer assessment results when selected peers change ─────────────
  useEffect(() => {
    if (selectedPeerIds.size === 0) {
      setPeerAssessments([]);
      return;
    }
    (async () => {
      const peerIdArr = Array.from(selectedPeerIds);
      const { data: results } = await (supabase as any)
        .from("assessment_results")
        .select("id, user_id, instrument_id, created_at")
        .in("user_id", peerIdArr)
        .eq("instrument_id", peerInstrument);
      if (!results) return;

      const instrumentIds: string[] = Array.from(new Set<string>(results.map((r: any) => r.instrument_id).filter(Boolean)));
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

      const peerMap = new Map<string, string>(peers.map((p) => [p.user_id, p.full_name || p.email]));

      const options: AssessmentOption[] = results.map((r: any) => ({
        id: r.id,
        instrument_id: r.instrument_id,
        instrument_name: instrumentNames[r.instrument_id] || r.instrument_id,
        completed_at: r.created_at,
        owner_label: peerMap.get(r.user_id) || "Peer",
        user_id: r.user_id,
        is_peer: true,
      }));
      setPeerAssessments(options);
    })();
  }, [selectedPeerIds, peerInstrument, peers]);

  // ── Init: load own assessments, read URL params ──────────────────────────
  useEffect(() => {
    if (!user) return;

    const urlPeerIds = searchParams.get("peers")?.split(",").filter(Boolean) ?? [];
    const includeSelf = searchParams.get("self") !== "false";

    const init = async () => {
      const { data: userData } = await supabase
        .from("users")
        .select("subscription_tier, full_name")
        .eq("id", user.id)
        .single();
      const t = userData?.subscription_tier || "base";
      setTier(t);
      await fetchUsage(t);

      const firstName = userData?.full_name?.split(" ")[0] || "there";

      let ownAssessments: AssessmentOption[] = [];
      if (includeSelf) {
        // EPN is filed BY an executive ABOUT this user; not a self-administered result, do not surface as a standalone tile.
        const { data: results } = await supabase
          .from("assessment_results")
          .select("id, instrument_id, created_at")
          .eq("user_id", user.id)
          .neq("instrument_id", "INST-002L")
          .order("created_at", { ascending: false });

        if (results && results.length > 0) {
          const instrumentIds: string[] = [...new Set(results.map((r) => r.instrument_id).filter(Boolean) as string[])];
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
          ownAssessments = results.map((r) => ({
            id: r.id,
            instrument_id: r.instrument_id || "",
            instrument_name: instrumentNames[r.instrument_id || ""] || r.instrument_id || "Assessment",
            completed_at: r.created_at,
            owner_label: "You",
            user_id: user.id,
            is_peer: false,
          }));
        }
      }

      setAllAssessments(ownAssessments);

      // Pre-select all own assessments by default
      const defaultSelected = new Set<string>(ownAssessments.map((a) => a.id));
      setSelectedIds(defaultSelected);

      // Pre-select peers from URL params
      if (urlPeerIds.length > 0) {
        setSelectedPeerIds(new Set<string>(urlPeerIds));
      }

      // Welcome message
      if (ownAssessments.length > 0) {
        const first = ownAssessments[0];
        const date = new Date(first.completed_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        setMessages([
          {
            role: "assistant",
            content: `Hi ${firstName}, I'm here to help you explore your assessment results. I can see your **${first.instrument_name}** results from **${date}**. What would you like to reflect on?`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages([
          {
            role: "assistant",
            content: `Hi ${firstName}, I'm ready to help you explore assessment results. Select the assessments you'd like to discuss on the left.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      setInitialLoading(false);
    };
    init();
  }, [user, fetchUsage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-select new peer assessments when they load ──────────────────────
  useEffect(() => {
    if (peerAssessments.length > 0) {
      setSelectedIds((prev) => {
        const next = new Set<string>(prev);
        peerAssessments.forEach((a) => next.add(a.id));
        return next;
      });
    }
  }, [peerAssessments]);

  // ── Derived: merged assessment list ─────────────────────────────────────
  const allContextAssessments = useMemo<AssessmentOption[]>(
    () => [...allAssessments, ...peerAssessments],
    [allAssessments, peerAssessments],
  );

  // ── Filtered peer list ───────────────────────────────────────────────────
  const filteredPeers = useMemo<Peer[]>(() => {
    if (!peerSearch) return peers;
    const q = peerSearch.toLowerCase();
    return peers.filter((p) => (p.full_name ?? p.email).toLowerCase().includes(q));
  }, [peers, peerSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const togglePeer = (peerId: string) => {
    setSelectedPeerIds((prev) => {
      const next = new Set<string>(prev);
      if (next.has(peerId)) {
        next.delete(peerId);
        // Deselect this peer's assessments too
        setSelectedIds((prevSel) => {
          const selNext = new Set<string>(prevSel);
          peerAssessments.filter((a) => a.user_id === peerId).forEach((a) => selNext.delete(a.id));
          return selNext;
        });
      } else {
        next.add(peerId);
      }
      return next;
    });
  };

  const toggleAssessment = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set<string>(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const saveSession = useCallback(
    async (
      currentMessages: ChatMessage[],
      currentSessionId: string | null,
      currentSelectedIds: string[],
      ended = false,
    ): Promise<string | null> => {
      if (!user) return currentSessionId;
      const messagesJson = currentMessages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
      const msgCount = currentMessages.filter((m) => m.role === "user").length;

      if (!currentSessionId) {
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
        const updateData: { messages: typeof messagesJson; message_count: number; ended_at?: string } = {
          messages: messagesJson,
          message_count: msgCount,
        };
        if (ended) updateData.ended_at = new Date().toISOString();
        await supabase.from("chat_sessions").update(updateData).eq("id", currentSessionId);
        return currentSessionId;
      }
    },
    [user],
  );

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending) return;
    const userMsg = message.trim();
    setMessage("");
    setSending(true);

    const newUserMsg: ChatMessage = {
      role: "user",
      content: userMsg,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Split selected IDs into own vs peer
      const ownSelected = Array.from(selectedIds).filter((id) => allAssessments.some((a) => a.id === id));
      const peerSelected = Array.from(selectedIds).filter((id) => peerAssessments.some((a) => a.id === id));

      // Build peer_labels: result_id -> peer name (for Edge Function context)
      const peerLabels: Record<string, string> = {};
      peerAssessments.forEach((a) => {
        if (selectedIds.has(a.id)) peerLabels[a.id] = a.owner_label;
      });

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: userMsg,
          conversation_history: history,
          assessment_result_ids: ownSelected,
          peer_result_ids: peerSelected,
          peer_labels: peerLabels,
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

      if (isCorp) fetchCorpUsage();

      const newSessionId = await saveSession(allMessages, sessionId, Array.from(selectedIds));
      if (newSessionId) setSessionId(newSessionId);

      if (data.usage) await fetchUsage(tier);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
      setMessages((prev) => prev.slice(0, -1));
      setMessage(userMsg);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [
    message,
    sending,
    messages,
    selectedIds,
    allAssessments,
    peerAssessments,
    tier,
    fetchUsage,
    saveSession,
    sessionId,
    isCorp,
    fetchCorpUsage,
  ]);

  const handleEndChat = async () => {
    if (messages.length > 1) {
      await saveSession(messages, sessionId, Array.from(selectedIds), true);
    }
    toast.success("Conversation saved!");
    navigate("/ai-chat/history");
  };

  const limitReached = usage && !usage.allowed;

  // ── Render ────────────────────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── Left sidebar: peer selector (corporate users only) ─────────────── */}
      {isCorp && (
        <div className="w-72 shrink-0 border-r border-border flex flex-col bg-background">
          {/* Top controls */}
          <div className="p-3 space-y-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assessment context</p>

            {/* Own assessments */}
            {allAssessments.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Your assessments</p>
                {allAssessments.map((a) => {
                  const date = new Date(a.completed_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <label key={a.id} className="flex items-center gap-2 text-xs cursor-pointer py-1">
                      <Checkbox checked={selectedIds.has(a.id)} onCheckedChange={() => toggleAssessment(a.id)} />
                      <span className="truncate">
                        {a.instrument_name} — {date}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Peer instrument selector */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Shared results</p>
              <Select value={peerInstrument} onValueChange={(v) => setPeerInstrument(v as "INST-001" | "INST-003")}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INST-001">PTP</SelectItem>
                  {isAirsaEligible && <SelectItem value="INST-003">AIRSA</SelectItem>}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search peers..."
                  className="pl-6 h-7 text-xs"
                  value={peerSearch}
                  onChange={(e) => setPeerSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Peer list */}
          <div className="flex-1 overflow-y-auto">
            {loadingPeers ? (
              <p className="p-3 text-xs text-muted-foreground">Loading...</p>
            ) : filteredPeers.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground text-center">No shared results available</p>
            ) : (
              filteredPeers.map((peer) => (
                <div
                  key={peer.user_id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer"
                  onClick={() => togglePeer(peer.user_id)}
                >
                  <Checkbox
                    checked={selectedPeerIds.has(peer.user_id)}
                    onCheckedChange={() => togglePeer(peer.user_id)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground truncate">{peer.full_name ?? peer.email}</p>
                    {peer.department_name && (
                      <p className="text-[10px] text-muted-foreground truncate">{peer.department_name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selected peer assessments */}
          {peerAssessments.length > 0 && (
            <div className="border-t border-border p-3 space-y-1">
              <p className="text-xs font-medium text-foreground">Peer assessments</p>
              {peerAssessments.map((a) => {
                const date = new Date(a.completed_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <label key={a.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                    <Checkbox checked={selectedIds.has(a.id)} onCheckedChange={() => toggleAssessment(a.id)} />
                    <span className="truncate">
                      {a.owner_label} · {a.instrument_name} — {date}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            AI Chat
          </h1>
          <div className="flex items-center gap-3">
            {isCorp && corpUsage?.ai_chat_enabled && corpUsage.chat_remaining > 0 && (
              <div className="w-40">
                <CorpUsageCounter currentCount={corpUsage.chat_used} limit={corpUsage.chat_allowance} />
              </div>
            )}
            {!isCorp && usage && !limitReached && (
              <div className="w-40">
                <UsageCounter currentCount={usage.current_count} limit={usage.limit} />
              </div>
            )}
            <Link
              to="/ai-chat/history"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Link>
          </div>
        </div>

        {/* Non-corporate assessment selector (flat checkbox list) */}
        {!isCorp && allContextAssessments.length > 0 && (
          <div className="shrink-0 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Assessment context:</p>
            <div className="flex flex-wrap gap-3">
              {allContextAssessments.map((a) => {
                const date = new Date(a.completed_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selectedIds.has(a.id)} onCheckedChange={() => toggleAssessment(a.id)} />
                    <span>
                      {a.owner_label !== "You" ? `${a.owner_label} · ` : ""}
                      {a.instrument_name} — {date}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat messages */}
        <ScrollArea className="flex-1 border rounded-lg bg-background">
          <div className="p-4 space-y-4 min-h-[300px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <MessageSquare className="h-12 w-12 opacity-30 mb-2" />
                <p className="text-sm">Select assessments on the left to start chatting.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                      <img src="/brain-icon.png" alt="" className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
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
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                    <img src="/brain-icon.png" alt="" className="h-4 w-4" />
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

        {/* Input area or limit/disabled cards */}
        {isCorp && corpUsage && !corpUsage.ai_chat_enabled ? (
          <Card>
            <CardContent className="py-6 flex flex-col items-center text-center gap-2">
              <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              <p className="font-semibold text-foreground text-sm">AI Chat Not Available</p>
              <p className="text-xs text-muted-foreground">
                AI Chat is not included in your organization's contract. Contact your org admin.
              </p>
            </CardContent>
          </Card>
        ) : isCorp && corpUsage && corpUsage.chat_remaining <= 0 ? (
          <Card>
            <CardContent className="py-6 flex flex-col items-center text-center gap-2">
              <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              <p className="font-semibold text-foreground text-sm">Monthly Limit Reached</p>
              <p className="text-xs text-muted-foreground">
                Your monthly AI chat limit is reached. Contact your org admin.
              </p>
            </CardContent>
          </Card>
        ) : limitReached ? (
          <LimitReached limit={usage.limit} tier={usage.tier || tier} />
        ) : (
          <div className="space-y-2 shrink-0">
            {messages.length > 1 && (
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Save className="h-3.5 w-3.5" />
                      End & Save Chat
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
                disabled={
                  sending ||
                  !message.trim() ||
                  usageLoading ||
                  (isCorp && corpUsage != null && (corpUsage.chat_remaining <= 0 || !corpUsage.ai_chat_enabled))
                }
                className="self-end"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
