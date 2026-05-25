import { Node, mergeAttributes } from "@tiptap/core";

const ACCENT_COLORS = [
  "orange",
  "forest",
  "teal",
  "plum",
  "mustard",
  "navy",
] as const;
type AccentColor = (typeof ACCENT_COLORS)[number];

function clampAccent(v: string | null): AccentColor {
  return (ACCENT_COLORS as readonly string[]).includes(v ?? "")
    ? (v as AccentColor)
    : "orange";
}

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
      numbered: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-numbered") !== "false",
        renderHTML: (attrs) =>
          attrs.numbered ? {} : { "data-numbered": "false" },
      },
      accent_color: {
        default: "orange" as AccentColor,
        parseHTML: (el) => clampAccent(el.getAttribute("data-accent-color")),
        renderHTML: (attrs) => ({ "data-accent-color": attrs.accent_color }),
      },
    };
  },

  // §151 (H5 Cycle 2): no import-fallback rule. content: "newsletterKeyMoment+" is a BrainWise-specific timeline pattern with no reliable external structural equivalent. External markup cannot satisfy the schema's content expression and ProseMirror's content coercion would drop the wrapper silently.
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
            numbered: el.getAttribute("data-numbered") !== "false",
            accent_color: clampAccent(el.getAttribute("data-accent-color")),
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
        "data-accent-color": node.attrs.accent_color,
        ...(node.attrs.numbered ? {} : { "data-numbered": "false" }),
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
