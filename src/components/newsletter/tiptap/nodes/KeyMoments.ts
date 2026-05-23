import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterKeyMoments — timeline-style numbered list.
 *
 * Parent contains 1+ `newsletterKeyMoment` children. Child is NOT in 'block'
 * group so it can only exist inside the parent. The visual timeline spine
 * is rendered via ::before pseudo-elements in newsletter-prose.css.
 */
export const NewsletterKeyMoments = Node.create({
  name: "newsletterKeyMoments",
  group: "block",
  content: "newsletterKeyMoment+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      title: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "section[data-newsletter-key-moments]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            title:
              el.querySelector(".newsletter-key-moments__title")
                ?.textContent ?? null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const title = node.attrs.title as string | null;
    const inner: any[] = [];
    if (title) {
      inner.push(["h3", { class: "newsletter-key-moments__title" }, title]);
    }
    inner.push(["ol", { class: "newsletter-key-moments__list" }, 0]);

    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-key-moments": "true",
        class: "newsletter-key-moments",
      }),
      ...inner,
    ] as any;
  },
});

export const NewsletterKeyMoment = Node.create({
  name: "newsletterKeyMoment",
  // Intentionally NOT in 'block' group.
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      title: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "li[data-newsletter-key-moment]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            title:
              el.querySelector(".newsletter-key-moment__title")?.textContent ??
              "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const title = (node.attrs.title as string) || "";
    return [
      "li",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-key-moment": "true",
        class: "newsletter-key-moment",
      }),
      ["div", { class: "newsletter-key-moment__title" }, title],
      ["div", { class: "newsletter-key-moment__body" }, 0],
    ] as any;
  },
});
