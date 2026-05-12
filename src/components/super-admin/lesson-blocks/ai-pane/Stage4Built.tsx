import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { CheckCircle2, ChevronDown, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./types";

interface Props {
  messages: ChatMessage[];
  onStartOver: () => void;
}

export function Stage4Built({ messages, onStartOver }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div
          className="flex items-start gap-3 rounded-lg p-4"
          style={{ backgroundColor: "#F9F7F1", color: "#021F36" }}
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5" style={{ color: "#2D6A4F" }} />
          <div>
            <h3 className="text-base font-semibold">Lesson built</h3>
            <p className="mt-1 text-sm">
              You can edit any block directly on the canvas, or refine specific blocks with AI from
              this panel.
            </p>
        </div>
        <div
          className="flex items-start gap-3 rounded-lg border p-4"
          style={{ backgroundColor: "#F3EEDF", borderColor: "#7a5800", color: "#7a5800" }}
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold">Don't forget to Save.</h4>
            <p className="mt-1 text-xs">
              The canvas has unsaved changes. Click <strong>Save</strong> at the top of the page to commit, or this work will be lost when you navigate away.
            </p>
          </div>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4" style={{ color: "#F5741A" }} />
            Refine a specific block with AI
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Click any block on the canvas and use the <strong>✨ Refine with AI</strong> button in
            its edit pane.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex w-full items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {historyOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {historyOpen ? "Hide" : "Show"} conversation history ({messages.length})
          </button>
          {historyOpen && (
            <div className="mt-2 space-y-2 rounded border p-2">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground">No messages.</p>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded px-2 py-1 text-xs",
                      m.role === "user" ? "text-foreground" : "text-foreground/90",
                    )}
                    style={{ backgroundColor: m.role === "user" ? "#FDEFE3" : "#F9F7F1" }}
                  >
                    <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {m.role}
                    </div>
                    {m.role === "assistant" ? (
                      <div className="prose prose-xs max-w-none break-words [&_p]:my-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <div className="border-t p-3">
        <Button variant="outline" className="w-full" onClick={onStartOver}>
          <RotateCcw className="mr-1 h-4 w-4" />
          Start a new conversation
        </Button>
      </div>
    </div>
  );
}
