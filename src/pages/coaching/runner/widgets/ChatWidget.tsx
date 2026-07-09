import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DictateButton } from "@/components/coaching/MultimodalField";
import { type ChatMsg } from "../shared";

export function ChatWidget({
  sessionId,
  chat,
  onChat,
  onRemainingChange,
}: {
  sessionId: string;
  chat: ChatMsg[];
  onChat: (next: ChatMsg[]) => void;
  onRemainingChange: (n: number | null) => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = message.trim();
    if (!text) return;
    setSending(true);
    const nextChat: ChatMsg[] = [...(chat || []), { role: "user", content: text }];
    onChat(nextChat);
    setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("coaching-activity-chat", {
        body: { session_id: sessionId, message: text },
      });
      if (error) {
        const status = (error as any).context?.status;
        if (status === 402) {
          toast.error("You've used your coaching runs.", {
            description: "Upgrade for more.",
            action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
          });
        } else if (status === 403) {
          toast.error("Access denied for this activity.");
        } else {
          toast.error("Chat failed. Please try again.");
        }
        return;
      }
      const reply: string = (data as any)?.reply || "";
      onChat([...nextChat, { role: "assistant", content: reply }]);
      if (typeof (data as any)?.coaching_remaining === "number") {
        onRemainingChange((data as any).coaching_remaining);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-[420px] overflow-y-auto rounded-lg border p-3">
        {(chat || []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask the AI coach anything about the plan above.
          </p>
        )}
        {(chat || []).map((m, i) => (
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
      <div className="flex gap-2">
        <Textarea
          rows={2}
          value={message}
          placeholder="Ask a question…"
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="flex flex-col gap-1">
          <Button onClick={send} disabled={sending || !message.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
          <DictateButton onFinal={(t) => setMessage((m) => (m ? m + " " : "") + t)} />
        </div>
      </div>
    </div>
  );
}
