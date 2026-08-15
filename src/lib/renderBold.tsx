import React from "react";

/**
 * Renders **double asterisk** spans as <strong>. Shared by the paired report,
 * the team report and the report chat, which previously each needed their own
 * copy. Deliberately handles bold ONLY: the AI prompts constrain output to
 * bold plus paragraph breaks, so anything more here would be dead code that
 * invites someone to widen the contract without updating the prompts.
 */
export const renderBold = (s: string) => {
  const parts = (s ?? "").split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>));
};
