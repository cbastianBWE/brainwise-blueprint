import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertCircle,
  Download,
  File as FileIcon,
  FileText,
  FileType,
  Highlighter,
  Loader2,
  Paperclip,
  Replace,
  Send,
  Sparkles,
  X,
} from "lucide-react";

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
import { useNewsletterAttachmentUpload, type PendingAttachment } from "./useNewsletterAttachmentUpload";
import {
  ACCEPTED_FILE_EXTENSIONS,
  MAX_ATTACHMENTS_PER_MESSAGE,
  stripHtmlToText,
  type AttachmentKind,
} from "./extractAttachmentText";
import {
  extractHtmlBlock,
  type ChatMessage,
  type ModelKey,
  type NewsletterAiGenerateResponse,
  type SelectionRange,
  type MessageAttachment,
} from "./types";

const SONNET_FULL_ID = "claude-sonnet-4-6";

interface Props {
  open: boolean;
  onClose: () => void;
  articleId: string | undefined;
  onImportHtml: (html: string) => void;
  editorSelection: SelectionRange | null;
  onReplaceSelection: (from: number, to: number, html: string) => void;
  onClearSelection: () => void;
  onOpenStockPicker: (initialQuery: string) => void;
}

/**
 * Parses a chat input as the `/image` slash command.
 * Returns `{ query }` (possibly empty string) when matched, else null.
 * Pure launcher — never produces a chat bubble or AI call.
 */
function parseStockImageCommand(input: string): { query: string } | null {
  const trimmed = input.trim();
  if (!trimmed.toLowerCase().startsWith("/image")) return null;
  const match = trimmed.match(/^\/image\b\s*(.*)$/i);
  if (!match) return null;
  return { query: match[1].trim() };
}

export function NewsletterAiPane({
  open,
  onClose,
  articleId,
  onImportHtml,
  editorSelection,
  onReplaceSelection,
  onClearSelection,
  onOpenStockPicker,
}: Props) {
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

  const attachmentManager = useNewsletterAttachmentUpload({
    articleId: articleId ?? "",
    userId: user?.id ?? "",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hydrationKey = `${articleId ?? ""}|${user?.id ?? ""}`;
  const hydratedKeyRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isGenerating]);

  const canSend =
    !!articleId &&
    !!user?.id &&
    !isImpersonating &&
    !isGenerating &&
    !attachmentManager.hasInFlightWork &&
    input.trim().length > 0;

  const handleSend = useCallback(async () => {
    if (!articleId || !user?.id) return;
    const trimmed = input.trim();

    // /image slash-command: pure launcher. Intercept BEFORE any state
    // mutation, AI call, or audit row. Pending attachments and active
    // selection are intentionally preserved.
    const stockCmd = parseStockImageCommand(trimmed);
    if (stockCmd) {
      onOpenStockPicker(stockCmd.query);
      setInput("");
      return;
    }

    if (
      !trimmed ||
      isGenerating ||
      isImpersonating ||
      attachmentManager.hasInFlightWork
    )
      return;

    const capturedSelection = editorSelection;
    const capturedAttachments: MessageAttachment[] =
      attachmentManager.readyAttachments.map((a) => ({
        kind: a.kind,
        name: a.file_name,
        storage_path: a.storage_path!,
      }));
    const requestAttachments = attachmentManager.readyAttachments.map((a) => ({
      kind: a.kind,
      name: a.file_name,
      storage_path: a.storage_path!,
      extracted_text: a.extracted_text!,
    }));

    const userMessage: ChatMessage = {
      id: `temp-${crypto.randomUUID()}`,
      role: "user",
      content: trimmed,
      generated_html: null,
      model_used: null,
      created_at: new Date().toISOString(),
      status: "pending",
      selection_range: capturedSelection,
      attachments: capturedAttachments,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    attachmentManager.clearAll();
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
            selection_range: capturedSelection,
            attachments: requestAttachments,
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
          selection_range: capturedSelection,
          attachments: [],
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
  }, [
    articleId,
    user?.id,
    input,
    isGenerating,
    isImpersonating,
    conversationId,
    model,
    editorSelection,
    attachmentManager,
    toast,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const totalAfterAdd = attachmentManager.pending.length + files.length;
    if (totalAfterAdd > MAX_ATTACHMENTS_PER_MESSAGE) {
      toast({
        title: "Too many attachments",
        description: `Max ${MAX_ATTACHMENTS_PER_MESSAGE} per message.`,
        variant: "destructive",
      });
      return;
    }
    void attachmentManager.addFiles(files);
  };

  const selectionPreview = editorSelection
    ? stripHtmlToText(editorSelection.html_snippet)
    : "";
  const selectionPreviewTruncated =
    selectionPreview.length > 80
      ? `${selectionPreview.slice(0, 80)}…`
      : selectionPreview;

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
              Ask the co-pilot to draft a section, suggest a structure, or help
              revise your article. You can also select text in the editor to
              ask for targeted edits, or attach research files (PDF, docx, txt,
              md) as context.
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onImport={onImportHtml}
                onReplaceSelection={onReplaceSelection}
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

      {/* Selection strip */}
      {editorSelection && (
        <div
          className="flex items-center gap-2 border-t bg-amber-50/60 px-3 py-1.5 text-xs"
          style={{ color: "var(--bw-navy, #021F36)" }}
        >
          <Highlighter className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="shrink-0 font-medium">Editing selection:</span>
          <span className="min-w-0 flex-1 truncate italic text-muted-foreground">
            "{selectionPreviewTruncated}"
          </span>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isImpersonating}
            aria-label="Clear selection"
            className="text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Attachment chips */}
      {attachmentManager.pending.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t bg-background px-3 py-2">
          {attachmentManager.pending.map((att) => (
            <AttachmentChip
              key={att.local_id}
              attachment={att}
              onRemove={() => attachmentManager.removeAttachment(att.local_id)}
            />
          ))}
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
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleFilePick}
              disabled={
                isImpersonating ||
                isGenerating ||
                !articleId ||
                attachmentManager.pending.length >= MAX_ATTACHMENTS_PER_MESSAGE
              }
              title="Attach file (PDF, docx, txt, md)"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
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
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS}
          multiple
          hidden
          onChange={handleFilesChosen}
        />
      </div>
    </aside>
  );
}

function kindIcon(kind: AttachmentKind) {
  if (kind === "docx") return FileType;
  if (kind === "txt" || kind === "md") return FileText;
  return FileIcon;
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: PendingAttachment;
  onRemove: () => void;
}) {
  const Icon = kindIcon(attachment.kind);
  const isFailed = attachment.status === "failed";
  const isBusy =
    attachment.status === "uploading" || attachment.status === "extracting";
  const displayName =
    attachment.file_name.length > 28
      ? `${attachment.file_name.slice(0, 25)}…`
      : attachment.file_name;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]",
        isFailed
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-border bg-muted/40 text-foreground",
      )}
      title={isFailed ? attachment.error ?? "Upload failed" : attachment.file_name}
    >
      {isBusy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3 shrink-0" />
      )}
      <span className="max-w-[160px] truncate">{displayName}</span>
      {isFailed && attachment.error && (
        <span className="truncate text-destructive">— {attachment.error}</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-muted-foreground hover:text-foreground"
        aria-label="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function MessageBubble({
  message,
  onImport,
  onReplaceSelection,
}: {
  message: ChatMessage;
  onImport: (html: string) => void;
  onReplaceSelection: (from: number, to: number, html: string) => void;
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

        {isUser && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.attachments.map((a, i) => {
              const Icon = kindIcon(a.kind);
              return (
                <span
                  key={`${a.storage_path}-${i}`}
                  className="inline-flex items-center gap-1 rounded bg-white/15 px-1.5 py-0.5 text-[10px] text-white"
                  title={a.name}
                >
                  <Icon className="h-2.5 w-2.5" />
                  <span className="max-w-[140px] truncate">{a.name}</span>
                </span>
              );
            })}
          </div>
        )}

        {!isUser && message.generated_html && (
          <div className="mt-2">
            {message.selection_range ? (
              <Button
                size="sm"
                onClick={() =>
                  onReplaceSelection(
                    message.selection_range!.from,
                    message.selection_range!.to,
                    message.generated_html!,
                  )
                }
                style={{ backgroundColor: "var(--bw-orange, #F5741A)", color: "white" }}
              >
                <Replace className="mr-2 h-4 w-4" />
                Replace selection with this
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onImport(message.generated_html!)}
                style={{ backgroundColor: "var(--bw-orange, #F5741A)", color: "white" }}
              >
                <Download className="mr-2 h-4 w-4" />
                Import this HTML into the article
              </Button>
            )}
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
