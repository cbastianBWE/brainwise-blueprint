import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAiUsage } from "@/hooks/useAiUsage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import UsageCounter from "@/components/ai/UsageCounter";
import LimitReached from "@/components/ai/LimitReached";

export default function AiChat() {
  const { user } = useAuth();
  const { usage, loading: usageLoading, fetchUsage, consumeMessage } = useAiUsage();
  const [tier, setTier] = useState("base");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch tier + usage on mount
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data } = await supabase
        .from("users")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      const t = data?.subscription_tier || "base";
      setTier(t);
      await fetchUsage(t);
    };
    init();
  }, [user, fetchUsage]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    // Check + increment usage
    const result = await consumeMessage(tier);

    if (!result || !result.allowed) {
      toast.error(result?.message || "You have reached your monthly limit.");
      setSending(false);
      return;
    }

    // TODO: Phase 2 — call AI chat edge function here
    toast.info("AI chat is coming soon. Your message count has been recorded.", {
      description: `Message ${result.current_count} of ${result.limit}`,
    });

    setMessage("");
    setSending(false);
  };

  const limitReached = usage && !usage.allowed;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> AI Chat
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ask questions about your assessment results
          </p>
        </div>
        {usage && !limitReached && (
          <div className="w-48">
            <UsageCounter currentCount={usage.current_count} limit={usage.limit} />
          </div>
        )}
      </div>

      {/* Chat area placeholder */}
      <Card className="min-h-[400px] flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center py-16">
          <div className="text-center text-muted-foreground space-y-2">
            <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
            <p className="text-sm">
              Your AI-powered assessment coach will appear here in Phase 2.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Input area or limit card */}
      {limitReached ? (
        <LimitReached limit={usage.limit} tier={usage.tier || tier} />
      ) : (
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask about your results..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="resize-none"
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
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
