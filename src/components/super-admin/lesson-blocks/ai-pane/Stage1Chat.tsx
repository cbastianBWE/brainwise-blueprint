import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Sparkles,
  X,
  FileText,
  File as FileIcon,
  Presentation,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  TOKEN_BUDGET,
  type AiMode,
  type ChatMessage,
  type LengthLevel,
  type SessionDocument,
  type VoicePreset,
} from "./types";
import { mapAiError } from "./mapAiError";
import { uploadAiAuthoringDoc } from "./uploadAiAuthoringDoc";
import { useVoiceDictation } from "./useVoiceDictation";

interface Props {
  contentItemId: string;
  voicePresets: VoicePreset[];
  voicePresetKey: string | null;
  onVoicePresetChange: (key: string | null) => void;
  customVoiceGuidance: string;
  onCustomVoiceGuidanceChange: (s: string) => void;
  customVoiceExample: string;
  onCustomVoiceExampleChange: (s: string) => void;
  messages: ChatMessage[];
  onMessagesChange: (next: ChatMessage[]) => void;
  attachedDocuments: SessionDocument[];
  onAttachedDocumentsChange: (docs: SessionDocument[]) => void;
  canvasIsEmpty: boolean;
  mode: AiMode;
  onModeChange: (mode: AiMode) => void;
  modeLocked: boolean;
  onUnlockMode: () => void;
  canvasBlockSummary: string | undefined;
  onAdvanceToOutline: () => void;
  loadingOutline: boolean;
  refreshAttachedDocs: () => Promise<void>;
  lengthPreference: LengthLevel;
  onLengthChange: (next: LengthLevel) => void;
}

const VOICE_LABELS: Record<string, string> = {
  conversational_coach: "Conversational coach",
  tactical_direct: "Tactical, direct",
  reflective_inquiry: "Reflective inquiry",
  academic_grounded: "Academic, grounded",
  scenario_storyteller: "Scenario storyteller",
};

export function Stage1Chat(props: Props) {
  const {
    contentItemId,
    voicePresets,
    voicePresetKey,
    onVoicePresetChange,
    customVoiceGuidance,
    onCustomVoiceGuidanceChange,
    customVoiceExample,
    onCustomVoiceExampleChange,
    messages,
    onMessagesChange,
    attachedDocuments,
    onAttachedDocumentsChange,
    canvasIsEmpty,
    mode,
    onModeChange,
    modeLocked,
    onUnlockMode,
    canvasBlockSummary,
    onAdvanceToOutline,
    loadingOutline,
    refreshAttachedDocs,
    lengthPreference,
    onLengthChange,
  } = props;

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showModeChangeWarning, setShowModeChangeWarning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const baseInputRef = useRef("");

  const dictation = useVoiceDictation({
    onFinal: (text) => {
      const sep = baseInputRef.current && !baseInputRef.current.endsWith(" ") ? " " : "";
      const next = baseInputRef.current + sep + text;
      baseInputRef.current = next;
      setInput(next);
    },
  });

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  const totalDocTokens = useMemo(
    () => attachedDocuments.reduce((acc, d) => acc + (d.out_extracted_text_token_count || 0), 0),
    [attachedDocuments],
  );

  const closestExpiryDays = useMemo(() => {
    if (attachedDocuments.length === 0) return null;
    const min = Math.min(
      ...attachedDocuments.map((d) =>
        Math.max(0, Math.floor((new Date(d.out_expires_at).getTime() - Date.now()) / 86_400_000)),
      ),
    );
    return min;
  }, [attachedDocuments]);

  const canShowGenerateOutline =
    messages.some((m) => m.role === "user") && messages.some((m) => m.role === "assistant");

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setChatError(null);

    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMsg];
    onMessagesChange(nextMessages);
    setInput("");
    baseInputRef.current = "";

    try {
      const { data, error } = await supabase.functions.invoke("ai-authoring-chat", {
        body: {
          content_item_id: contentItemId,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          attached_document_ids: attachedDocuments.map((d) => d.out_id),
          voice_preset_key: voicePresetKey ?? undefined,
          custom_voice_guidance: customVoiceGuidance || undefined,
          custom_voice_example: customVoiceExample || undefined,
          mode,
          length: lengthPreference,
          canvas_block_summary: canvasBlockSummary,
        },
      });
      if (error) throw error;
      const assistant = (data as any)?.message;
      if (!assistant?.content) throw { error: "ai_output_unparseable" };
      onMessagesChange([
        ...nextMessages,
        {
          role: "assistant",
          content: assistant.content,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      const info = mapAiError(e);
      setChatError(info.message);
      // Roll back the optimistic user message so they can retry/edit.
      onMessagesChange(messages);
      setInput(trimmed);
      baseInputRef.current = trimmed;
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // .ppt rejected client-side as a hint (server also rejects).
    if (/\.ppt$/i.test(file.name)) {
      setUploadError("PowerPoint files must be saved as .pptx (modern format). Please re-save and try again.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const res = await uploadAiAuthoringDoc({ contentItemId, file });
      const d = res.document;
      const optimistic: SessionDocument = {
        out_id: d.id,
        out_file_name: d.file_name,
        out_file_size_bytes: d.file_size_bytes,
        out_mime_type: d.mime_type,
        out_extracted_text_token_count: d.extracted_text_token_count,
        out_uploaded_at: d.uploaded_at,
        out_last_accessed_at: d.uploaded_at,
        out_expires_at: d.expires_at,
      };
      onAttachedDocumentsChange([...attachedDocuments, optimistic]);
      // Refresh authoritative list in the background.
      void refreshAttachedDocs();
    } catch (e) {
      const info = mapAiError(e);
      setUploadError(info.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDoc = async (docId: string) => {
    const prev = attachedDocuments;
    onAttachedDocumentsChange(prev.filter((d) => d.out_id !== docId));
    try {
      await supabase.functions.invoke("delete-ai-authoring-doc", {
        body: { document_id: docId },
      });
    } catch (e) {
      // Roll back on failure.
      onAttachedDocumentsChange(prev);
      const info = mapAiError(e);
      setUploadError(info.message);
    }
  };

  const showModeSelector = !canvasIsEmpty && !modeLocked;

  return (
    <div className="flex h-full flex-col">
      {/* Top controls */}
      <div className="space-y-3 border-b p-3">
        {/* Mode selector */}
        {showModeSelector && (
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mode</Label>
            <div className="mt-1 inline-flex w-full rounded-md border bg-muted p-0.5">
              <ModeBtn current={mode} value="append" onClick={onModeChange} disabled={canvasIsEmpty}>
                Add to this lesson
              </ModeBtn>
              <ModeBtn current={mode} value="replace" onClick={onModeChange} disabled={canvasIsEmpty}>
                Replace this lesson
              </ModeBtn>
              <ModeBtn current={mode} value="fresh" onClick={onModeChange}>
                Start fresh
              </ModeBtn>
            </div>
          </div>
        )}
        {!canvasIsEmpty && modeLocked && (
          <div className="flex items-center justify-between rounded-md bg-muted/60 px-2 py-1 text-xs">
            <span>
              Mode: <strong>{modeLabel(mode)}</strong>
            </span>
            <button
              type="button"
              className="text-primary underline hover:no-underline"
              onClick={() => setShowModeChangeWarning(true)}
            >
              Change
            </button>
          </div>
        )}
        {showModeChangeWarning && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs">
            Changing mode will reset this conversation.
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowModeChangeWarning(false)}
              >
                Keep mode
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setShowModeChangeWarning(false);
                  onUnlockMode();
                }}
              >
                Reset and change
              </Button>
            </div>
          </div>
        )}

        {/* Voice preset */}
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Voice</Label>
          <Select
            value={voicePresetKey ?? "custom"}
            onValueChange={(v) => onVoicePresetChange(v === "custom" ? null : v)}
          >
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {voicePresets.map((p) => (
                <SelectItem key={p.preset_key} value={p.preset_key}>
                  {p.display_name}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom voice…</SelectItem>
            </SelectContent>
          </Select>
          {voicePresetKey === null && (
            <div className="mt-2 space-y-2">
              <Textarea
                rows={2}
                placeholder="Voice guidance (how should the AI write?)"
                value={customVoiceGuidance}
                onChange={(e) => onCustomVoiceGuidanceChange(e.target.value)}
              />
              <Textarea
                rows={2}
                placeholder="Voice example (a short paragraph in that voice)"
                value={customVoiceExample}
                onChange={(e) => onCustomVoiceExampleChange(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Attached docs */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {attachedDocuments.length} doc{attachedDocuments.length === 1 ? "" : "s"} attached · ~
              {formatTokens(totalDocTokens)} / {formatTokens(TOKEN_BUDGET)} limit
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="mr-1 h-3.5 w-3.5" />
              )}
              Attach reference doc
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.docx,.pptx,.ppt"
              hidden
              onChange={handleFilePicked}
            />
          </div>
          {closestExpiryDays !== null && closestExpiryDays < 7 && (
            <div className="mt-1 text-[11px]" style={{ color: "#7a5800" }}>
              Reference docs auto-delete in {closestExpiryDays} day{closestExpiryDays === 1 ? "" : "s"} unless used.
            </div>
          )}
          {attachedDocuments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {attachedDocuments.map((d) => (
                <DocChip key={d.out_id} doc={d} onRemove={() => handleRemoveDoc(d.out_id)} />
              ))}
            </div>
          )}
          {uploadError && (
            <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
              {uploadError}
            </div>
          )}
        </div>
      </div>

      {/* Chat thread */}
      <div className="flex-1 overflow-y-auto p-3" style={{ backgroundColor: "#FBFAF7" }}>
        {messages.length === 0 ? (
          <div
            className="rounded-lg p-4 text-[15px] leading-[1.6]"
            style={{ backgroundColor: "#F9F7F1", color: "#021F36" }}
          >
            Tell me what you want this lesson to teach. Who's it for? What should learners walk away
            knowing? You can attach reference docs above, dictate with the mic, or just type.
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}
            {sending && (
              <div className="flex items-center gap-1 px-2 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" />
              </div>
            )}
            <div ref={threadEndRef} />
          </div>
        )}
        {chatError && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            {chatError}
            <Button size="sm" variant="ghost" className="ml-2 h-7" onClick={() => void handleSend()}>
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* Generate outline CTA — sits above input, always visible when applicable */}
      {canShowGenerateOutline && (
        <div className="flex-shrink-0 border-t p-3">
          <Button
            type="button"
            className="w-full shadow-cta"
            disabled={loadingOutline}
            onClick={onAdvanceToOutline}
            style={{ backgroundColor: "#F5741A", color: "white" }}
            title="Generate a structured outline based on this conversation."
          >
            {loadingOutline ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            Generate outline
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t p-3">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              baseInputRef.current = e.target.value;
            }}
            onKeyDown={handleKeyDown}
            rows={3}
            className="resize-none pr-20"
            placeholder={
              dictation.isListening
                ? `Listening… ${dictation.transcript}`
                : "Type your message. Cmd/Ctrl+Enter to send."
            }
            disabled={sending}
          />
          {dictation.isListening && dictation.transcript && (
            <div className="pointer-events-none absolute inset-x-3 top-3 max-w-[calc(100%-5rem)] truncate text-sm text-muted-foreground/60">
              {input}
              <span className="ml-1 italic">{dictation.transcript}</span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={!dictation.isSupported}
              title={
                dictation.isSupported
                  ? dictation.isListening
                    ? "Click to stop"
                    : "Click to dictate"
                  : "Voice dictation not supported in this browser. Try Chrome, Edge, or Safari."
              }
              onClick={() => (dictation.isListening ? dictation.stop() : dictation.start())}
              className={cn(dictation.isListening && "animate-pulse")}
              style={dictation.isListening ? { color: "#F5741A" } : undefined}
            >
              {dictation.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={() => void handleSend()}
              disabled={!input.trim() || sending}
              style={input.trim() && !sending ? { backgroundColor: "#F5741A", color: "white" } : undefined}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {dictation.error && (
          <p className="mt-1 text-xs text-destructive">{dictation.error}</p>
        )}
      </div>
    </div>
  );

  // local helpers (closures retained by components above)
}

function modeLabel(m: AiMode): string {
  return m === "append" ? "Append" : m === "replace" ? "Replace" : "Fresh";
}

function ModeBtn(props: {
  current: AiMode;
  value: AiMode;
  onClick: (m: AiMode) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const active = props.current === props.value;
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => props.onClick(props.value)}
      className={cn(
        "flex-1 rounded-sm px-2 py-1 text-xs transition-colors",
        active ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
        props.disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {props.children}
    </button>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className="max-w-[85%] rounded-lg px-3 py-2 text-[15px] leading-[1.6]"
        style={{
          backgroundColor: isUser ? "#FDEFE3" : "#F9F7F1",
          color: "#021F36",
        }}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          <div className="prose prose-sm max-w-none break-words [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function DocChip({ doc, onRemove }: { doc: SessionDocument; onRemove: () => void }) {
  const Icon = iconForMime(doc.out_mime_type, doc.out_file_name);
  return (
    <div className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="max-w-[180px] truncate" title={doc.out_file_name}>
        {truncateMid(doc.out_file_name, 30)}
      </span>
      <span className="text-muted-foreground">~{formatTokens(doc.out_extracted_text_token_count)}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Remove ${doc.out_file_name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function iconForMime(mime: string, name: string) {
  const lower = (name || "").toLowerCase();
  if (mime?.includes("pdf") || lower.endsWith(".pdf")) return FileText;
  if (mime?.includes("presentation") || lower.endsWith(".ppt") || lower.endsWith(".pptx"))
    return Presentation;
  if (mime?.includes("word") || lower.endsWith(".docx") || lower.endsWith(".doc")) return FileText;
  return FileIcon;
}

function truncateMid(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
