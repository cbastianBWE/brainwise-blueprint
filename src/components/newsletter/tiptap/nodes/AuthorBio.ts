import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterAuthorBio — atom carrying a single user_id FK. Renders an empty
 * <aside> skeleton with data-* hooks; the H3 reader-path hydration script
 * fills in avatar / name / bio from get_newsletter_author_bio at runtime.
 * The editor NodeView renders a live, resolved author card.
 */
export const NewsletterAuthorBio = Node.create({
  name: "newsletterAuthorBio",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      user_id: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "aside[data-newsletter-author-bio]",
        priority: 51,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const raw = el.getAttribute("data-user-id");
          return {
            user_id: raw && raw.length > 0 ? raw : null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const userId = (node.attrs.user_id as string | null) ?? null;
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-author-bio": "true",
        "data-user-id": userId ?? "",
      }),
      ["div", { "data-newsletter-author-bio-avatar": "true" }],
      [
        "div",
        { "data-newsletter-author-bio-content": "true" },
        ["p", { "data-newsletter-author-bio-name": "true" }, ""],
        ["p", { "data-newsletter-author-bio-text": "true" }, ""],
      ],
    ] as never;
  },
});
