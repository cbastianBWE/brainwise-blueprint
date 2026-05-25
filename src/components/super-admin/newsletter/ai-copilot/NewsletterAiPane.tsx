import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Download, Loader2, Send, Sparkles, X, AlertCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import { useNewsletterAiConversation } from "./useNewsletterAiConversation";
import { mapNewsletterAiError } from "./mapNewsletterAiError";
import {
  extractHtmlBlock,
  type ChatMessage,
  type ModelKey,
  type NewsletterAiGenerateResponse,
} from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  articleId: string | undefined;
  onImportHtml: (html: string) => void;
}

const SONNET_FULL_ID = "claude-sonnet-4-6";

export function NewsletterAiPane({ open, onClose, articleId, onImportHtml }: Props) {
  const { user } = useAuth();
  const { isImpersonating } = useImpersonation();
  const { toast } = useToast();

  const {
    conversationId: loadedConvId,
    lastModelUsed,
    messages: loadedMessages,
    isLoading: isLoadingHistory,
    error: historyError,
  } = useNewsletterAiConversation(articleId, user?.id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<ModelKey>("opus");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hydrationKey = `${articleId ?? ""}|${user?.id ?? ""}`;
  const hydratedKeyRef = useRef<string | null>(null);

  // Hydrate from loaded conversation (once per articleId/userId).
  useEffect(() => {
    if (!articleId || !user?.id) return;
    if (isLoadingHistory) return;
    if (hydratedKeyRef.current === hydrationKey) return;
    hydratedKeyRef.current = hydrationKey;
    setHasHydrated(true);
    if (historyError) return;
    setMessages(loadedMessages);
    setConversationId(loadedConvId);
    if (lastModelUsed === SONNET_FULL_ID) setModel("sonnet");
    else setModel("opus");
  }, [
    articleId,
    user?.id,
    isLoadingHistory,
    historyError,
    loadedMessages,
    loadedConvId,
    lastModelUsed,
    hydrationKey,
  ]);

  // Auto-scroll to bottom on new messages / generation toggle.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isGenerating]);

  const canSend =
    !!articleId &&
    !!user?.id &&
    !isImpersonating &&
    !isGenerating &&
    input.trim().length > 0;

  const handleSend = useCallback(async () => {
    if (!articleId || !user?.id) return;
    const trimmed = input.trim();
    if (!trimmed || isGenerating || isImpersonating) return;

    const userMessage: ChatMessage = {
      id: `temp-${crypto.randomUUID()}`,
      role: "user",
      content: trimmed,
      generated_html: null,
      model_used: null,
      created_at: new Date().toISOString(),
      status: "pending",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const { data, error } = await supabase.functions.invoke<NewsletterAiGenerateResponse>(
        "newsletter_ai_generate",
        {
          body: {
            article_id: articleId,
            conversation_id: conversationId,
            user_message: trimmed,
            model,
          },
        },
      );
      if (error) throw error;
      if (!data) throw new Error("no_response_body");

      setConversationId(data.conversation_id);
      const assistantContent = data.assistant_message?.content ?? "";
      const html =
        data.generated_html ??
        (assistantContent ? extractHtmlBlock(assistantContent) : null);

      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === userMessage.id ? { ...m, status: "persisted" as const } : m,
        );
        const assistantMessage: ChatMessage = {
          id: `assistant-${crypto.randomUUID()}`,
          role: "assistant",
          content: assistantContent,
          generated_html: html,
          model_used: data.model_used,
          created_at: new Date().toISOString(),
          status: "persisted",
        };
        return [...updated, assistantMessage];
      });
    } catch (e) {
      const mapped = await mapNewsletterAiError(e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMessage.id ? { ...m, status: "failed" as const } : m,
        ),
      );
      setGenerationError(mapped);
      toast({
        title: "Co-pilot error",
        description: mapped,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [articleId, user?.id, input, isGenerating, isImpersonating, conversationId, model, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed bottom-0 z-30 flex w-[min(480px,100vw)] flex-col border-l bg-background shadow-xl transition-[right] duration-300 ease-out",
        !open && "pointer-events-none",
      )}
      style={{
        top: 56,
        right: open ? 0 : -480,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: "var(--bw-orange, #F5741A)" }} />
          <h2
            className="truncate text-sm font-semibold"
            style={{ color: "var(--bw-navy, #021F36)" }}
          >
            Newsletter co-pilot
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={model}
            onValueChange={(v) => v && setModel(v as ModelKey)}
            aria-label="Model"
          >
            <ToggleGroupItem value="opus" className="h-7 px-2 text-xs">Opus</ToggleGroupItem>
            <ToggleGroupItem value="sonnet" className="h-7 px-2 text-xs">Sonnet</ToggleGroupItem>
          </ToggleGroup>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onClose}
            aria-label="Close co-pilot"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isImpersonating && (
        <div className="border-b bg-amber-50 px-3 py-2 text-xs text-amber-900">
          The co-pilot is disabled during impersonation. End impersonation to continue.
        </div>
      )}

      {/* Message history */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="flex flex-col gap-3 px-3 py-4">
          {isLoadingHistory && !hasHydrated ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : historyError && messages.length === 0 ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              Couldn't load conversation history. {historyError.message}
            </div>
          ) : messages.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              Ask the co-pilot to draft a section, suggest a structure, or help revise your article.
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onImport={onImportHtml}
              />
            ))
          )}

          {isGenerating && (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking…</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {generationError && (
        <div className="flex items-start gap-2 border-t bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{generationError}</span>
          <button
            type="button"
            onClick={() => setGenerationError(null)}
            className="text-destructive/70 hover:text-destructive"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-background p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the co-pilot..."
          disabled={isImpersonating || isGenerating || !articleId}
          className="min-h-[80px] max-h-[240px] resize-y text-sm"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            Cmd/Ctrl + Enter to send
          </span>
          <Button
            onClick={() => void handleSend()}
            disabled={!canSend}
            size="sm"
            style={{
              backgroundColor: canSend ? "var(--bw-orange, #F5741A)" : undefined,
              color: canSend ? "white" : undefined,
            }}
          >
            {isGenerating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1 h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      </div>
    </aside>
  );
}

function MessageBubble({
  message,
  onImport,
}: {
  message: ChatMessage;
  onImport: (html: string) => void;
}) {
  const isUser = message.role === "user";
  const isPending = message.status === "pending";
  const isFailed = message.status === "failed";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "text-white"
            : "bg-[var(--bw-cream-100,#FBF6EE)] text-[var(--bw-navy,#021F36)]",
          isPending && "opacity-80 animate-pulse",
          isFailed && "border border-destructive/40",
        )}
        style={
          isUser
            ? { backgroundColor: "var(--bw-navy, #021F36)" }
            : undefined
        }
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          <div className="newsletter-copilot-markdown break-words">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {!isUser && message.generated_html && (
          <div className="mt-2">
            <Button
              size="sm"
              onClick={() => onImport(message.generated_html!)}
              style={{ backgroundColor: "var(--bw-orange, #F5741A)", color: "white" }}
            >
              <Download className="mr-2 h-4 w-4" />
              Import this HTML into the article
            </Button>
          </div>
        )}

        {isFailed && (
          <div className="mt-1 text-[11px] text-destructive">Failed to send.</div>
        )}
        {isPending && isUser && (
          <div className="mt-1 text-[11px] text-white/70">Sending…</div>
        )}
      </div>
    </div>
  );
}
