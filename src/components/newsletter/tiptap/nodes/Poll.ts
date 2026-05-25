import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterPoll — atom block referencing a row in `newsletter_polls`.
 *
 * Unlike every other H2 node, durable poll data (question, options, style,
 * votes_visible, is_locked) lives in the database row identified by poll_id.
 * The doc serializes only the foreign key. NodeView calls create_poll on
 * first edit (article must be saved) and update_poll on subsequent edits.
 * Reader NodeView calls get_poll_results.
 *
 * parseHTML priority 60 on scoped data-attr selector per §144.
 */
export const NewsletterPoll = Node.create({
  name: "newsletterPoll",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      poll_id: {
        default: null as string | null,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-poll-id") || null,
        renderHTML: (attrs) =>
          attrs.poll_id ? { "data-poll-id": String(attrs.poll_id) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-newsletter-poll]", priority: 60 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-poll": "true",
        class: "newsletter-poll",
      }),
    ];
  },
});
