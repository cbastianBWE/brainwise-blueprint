import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractHtmlBlock, type ChatMessage } from "./types";

interface LoadedConversation {
  conversationId: string | null;
  lastModelUsed: string | null;
  messages: ChatMessage[];
}

const EMPTY: LoadedConversation = {
  conversationId: null,
  lastModelUsed: null,
  messages: [],
};

async function loadConversation(
  articleId: string,
  userId: string,
): Promise<LoadedConversation> {
  const { data: conv, error: convErr } = await supabase
    .from("newsletter_ai_conversations")
    .select("id, last_model_used")
    .eq("article_id", articleId)
    .eq("author_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (convErr) throw convErr;
  if (!conv) return EMPTY;

  const { data: rows, error: msgErr } = await supabase
    .from("newsletter_ai_messages")
    .select("id, role, content, model_used, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });

  if (msgErr) throw msgErr;

  const messages: ChatMessage[] = (rows ?? []).map((r) => {
    const role = r.role === "assistant" ? "assistant" : "user";
    return {
      id: r.id,
      role,
      content: r.content ?? "",
      generated_html: role === "assistant" ? extractHtmlBlock(r.content ?? "") : null,
      model_used: r.model_used,
      created_at: r.created_at,
      status: "persisted" as const,
    };
  });

  return {
    conversationId: conv.id,
    lastModelUsed: conv.last_model_used,
    messages,
  };
}

export function useNewsletterAiConversation(
  articleId: string | undefined,
  userId: string | undefined,
) {
  const queryClient = useQueryClient();
  const enabled = !!articleId && !!userId;

  const query = useQuery({
    queryKey: ["newsletter-ai-conversation", articleId, userId],
    queryFn: () => loadConversation(articleId!, userId!),
    enabled,
    staleTime: 30_000,
  });

  return {
    conversationId: query.data?.conversationId ?? null,
    lastModelUsed: query.data?.lastModelUsed ?? null,
    messages: query.data?.messages ?? [],
    isLoading: enabled && query.isLoading,
    error: query.error as Error | null,
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: ["newsletter-ai-conversation", articleId, userId],
      }),
  };
}
