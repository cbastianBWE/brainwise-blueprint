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
      alignment: {
        default: "center" as "left" | "center" | "right",
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-alignment");
          return ["left", "center", "right"].includes(v || "")
            ? (v as "left" | "center" | "right")
            : "center";
        },
        renderHTML: (attrs) => ({ "data-alignment": attrs.alignment }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "blockquote[data-newsletter-pullquote]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const a = el.getAttribute("data-alignment");
          return {
            attribution:
              el.querySelector(".newsletter-pullquote__attribution")
                ?.textContent ?? null,
            alignment: ["left", "center", "right"].includes(a || "")
              ? a
              : "center",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attribution = node.attrs.attribution as string | null;
    const alignment =
      (node.attrs.alignment as "left" | "center" | "right") || "center";

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
        "data-alignment": alignment,
        class: "newsletter-pullquote",
      }),
      ...inner,
    ] as any;
  },
});
