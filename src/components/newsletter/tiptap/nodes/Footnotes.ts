import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterFootnotes — atom block that renders an auto-numbered list of all
 * FootnoteRef marks in the document at render time. No attrs; content is
 * derived by walking the editor doc (see useFootnotesAggregator).
 *
 * Per D1 (P7c): refs own the text, this block is a pure render-time
 * aggregator. Deleting a ref deletes its entry; reordering refs reorders
 * the list. Multiple Footnotes blocks per article are allowed (each renders
 * the full list).
 */
export const NewsletterFootnotes = Node.create({
  name: "newsletterFootnotes",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      {
        tag: "div[data-newsletter-footnotes]",
        priority: 60,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-footnotes": "true",
        class: "newsletter-footnotes",
      }),
    ];
  },
});
