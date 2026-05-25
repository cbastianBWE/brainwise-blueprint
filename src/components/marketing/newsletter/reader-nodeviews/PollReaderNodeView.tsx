import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { NewsletterPollAttrs } from "@/components/newsletter/tiptap/types";

type PollOption = { id: string; label: string };
type PollStyle = "buttons" | "bars";

interface PollResultsResponse {
  found: boolean;
  poll?: {
    id: string;
    article_id: string;
    node_id: string;
    question: string;
    options: PollOption[];
    style: PollStyle;
    votes_visible: boolean;
    is_locked: boolean;
  };
  results?: Record<string, number> | null;
  total_votes?: number;
  user_vote?: string | null;
}

export default function PollReaderNodeView({ node }: NodeViewProps) {
  const { poll_id } = node.attrs as NewsletterPollAttrs;
  const [showSigninCta, setShowSigninCta] = useState(false);
  const [voting, setVoting] = useState(false);

  const query = useQuery({
    queryKey: ["newsletter-poll-results", poll_id],
    enabled: !!poll_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_poll_results", {
        p_poll_id: poll_id as string,
      });
      if (error) throw error;
      return data as unknown as PollResultsResponse;
    },
  });

  if (!poll_id) return null;

  if (query.isLoading) {
    return (
      <NodeViewWrapper
        as="div"
        data-newsletter-poll="true"
        className="newsletter-poll"
      >
        <div
          className="animate-pulse"
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ height: 22, background: "rgba(0,0,0,0.08)", borderRadius: 4, width: "70%" }} />
          <div style={{ height: 40, background: "rgba(0,0,0,0.06)", borderRadius: 6 }} />
          <div style={{ height: 40, background: "rgba(0,0,0,0.06)", borderRadius: 6 }} />
        </div>
      </NodeViewWrapper>
    );
  }

  const data = query.data;
  if (!data || data.found === false || !data.poll) return null;

  const poll = data.poll;
  const results = data.results ?? {};
  const totalVotes = data.total_votes ?? 0;
  const userVote = data.user_vote ?? null;
  const revealCounts =
    poll.votes_visible && totalVotes > 0 && (userVote !== null || poll.is_locked);

  const handleVote = async (optionId: string) => {
    if (userVote !== null || poll.is_locked || voting) return;
    setVoting(true);
    const { error } = await supabase.rpc("vote_on_poll", {
      p_poll_id: poll.id,
      p_option_id: optionId,
    });
    setVoting(false);
    if (error) {
      if (error.code === "42501") {
        setShowSigninCta(true);
        return;
      }
      if (error.code === "23505") {
        query.refetch();
        return;
      }
      toast.error(`Vote failed: ${error.message}`);
      return;
    }
    query.refetch();
  };

  const voteDisabled = userVote !== null || poll.is_locked;

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-poll="true"
      data-style={poll.style}
      data-locked={poll.is_locked ? "true" : undefined}
      className="newsletter-poll"
    >
      <h3 className="newsletter-poll__question">{poll.question}</h3>
      <div className="newsletter-poll__options">
        {poll.options.map((opt) => {
          const count = results[opt.id] ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const voted = userVote === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className="newsletter-poll__option"
              data-voted={voted ? "true" : undefined}
              disabled={voteDisabled}
              onClick={() => handleVote(opt.id)}
            >
              {poll.style === "bars" && revealCounts && (
                <span
                  className="newsletter-poll__bar-fill"
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
              )}
              <span className="newsletter-poll__option-label">{opt.label}</span>
              {revealCounts && (
                <span className="newsletter-poll__option-pct">{pct}%</span>
              )}
            </button>
          );
        })}
      </div>
      {showSigninCta && (
        <div className="newsletter-poll__signin-cta">
          <Link
            to={`/login?next=${typeof window !== "undefined" ? encodeURIComponent(window.location.pathname) : ""}`}
          >
            Sign in to vote
          </Link>
        </div>
      )}
      {poll.votes_visible && totalVotes > 0 && (
        <p className="newsletter-poll__total">
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        </p>
      )}
    </NodeViewWrapper>
  );
}
