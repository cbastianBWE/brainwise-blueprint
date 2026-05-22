import React from "react";

/**
 * Wrap case-insensitive substring matches of `query` in <mark> tags.
 * Returns React.ReactNode (string array with embedded mark elements).
 */
export function highlightMatch(text: string | null | undefined, query: string): React.ReactNode {
  if (!text) return null;
  if (!query || query.length < 2) return text;
  const parts: React.ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let cursor = 0;
  let idx = lowerText.indexOf(lowerQuery);
  while (idx !== -1) {
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      React.createElement(
        "mark",
        { key: `m${idx}`, className: "bg-amber-100 text-foreground rounded-sm px-0.5" },
        text.slice(idx, idx + query.length),
      ),
    );
    cursor = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
