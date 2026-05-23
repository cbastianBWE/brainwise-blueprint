import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterPullquote — large decorative quotation.
 *
 * Distinct from the built-in blockquote (which is a small inline citation).
 * Content is inline-only; renders as <blockquote data-newsletter-pullquote>
 * with optional <cite> for attribution.
 */
export const NewsletterPullquote = Node.create({
  name: "newsletterPullquote",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      attribution: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "blockquote[data-newsletter-pullquote]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            attribution:
              el.querySelector(".newsletter-pullquote__attribution")
                ?.textContent ?? null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attribution = node.attrs.attribution as string | null;

    const inner: any[] = [["p", { class: "newsletter-pullquote__text" }, 0]];
    if (attribution) {
      inner.push([
        "cite",
        { class: "newsletter-pullquote__attribution" },
        attribution,
      ]);
    }

    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-pullquote": "true",
        class: "newsletter-pullquote",
      }),
      ...inner,
    ] as any;
  },
});
