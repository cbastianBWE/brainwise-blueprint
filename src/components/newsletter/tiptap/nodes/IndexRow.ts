import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterIndexRow — side-by-side metric/comparison cards.
 *
 * Headless schema. Child `newsletterIndexCard` is an atom with editable
 * attrs and ships a React NodeView wired in NewsletterEditor.tsx (§146).
 */
export const NewsletterIndexRow = Node.create({
  name: "newsletterIndexRow",
  group: "block",
  content: "newsletterIndexCard+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      columns: {
        default: 2 as 2 | 3,
        parseHTML: (el: HTMLElement) => {
          const v = parseInt(el.getAttribute("data-columns") || "2", 10);
          return v === 3 ? 3 : 2;
        },
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-columns": String(attrs.columns),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-newsletter-index-row]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-index-row": "true",
        class: "newsletter-index-row",
      }),
      0,
    ] as any;
  },
});

/**
 * newsletterIndexCard — atom card with tag/name/optional formula/note.
 *
 * Intentionally NOT in 'block' group. `accent_color` enum mirrors
 * AccentMarkAttrs.color locked in A1a. Conditional formula div omitted
 * from the renderHTML inner array when `formula` is null/empty.
 */
export const NewsletterIndexCard = Node.create({
  name: "newsletterIndexCard",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      tag: { default: "" },
      name: { default: "" },
      formula: { default: null as string | null },
      note: { default: "" },
      accent_color: { default: "orange" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-newsletter-index-card]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            tag: el.getAttribute("data-tag") || "",
            name: el.getAttribute("data-name") || "",
            formula: el.getAttribute("data-formula") || null,
            note: el.getAttribute("data-note") || "",
            accent_color: el.getAttribute("data-accent-color") || "orange",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tag = (node.attrs.tag as string) || "";
    const name = (node.attrs.name as string) || "";
    const formula = node.attrs.formula as string | null;
    const note = (node.attrs.note as string) || "";
    const accent = (node.attrs.accent_color as string) || "orange";

    const dataAttrs: Record<string, string> = {
      "data-newsletter-index-card": "true",
      "data-tag": tag,
      "data-name": name,
      "data-note": note,
      "data-accent-color": accent,
      class: `newsletter-index-card newsletter-index-card--${accent}`,
    };
    if (formula) dataAttrs["data-formula"] = formula;

    const inner: any[] = [
      ["div", { class: "newsletter-index-card__tag" }, tag],
      ["div", { class: "newsletter-index-card__name" }, name],
    ];
    if (formula) {
      inner.push(["div", { class: "newsletter-index-card__formula" }, formula]);
    }
    inner.push(["div", { class: "newsletter-index-card__note" }, note]);

    return ["div", mergeAttributes(HTMLAttributes, dataAttrs), ...inner] as any;
  },
});
