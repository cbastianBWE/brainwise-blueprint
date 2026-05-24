import { Node, mergeAttributes } from "@tiptap/core";

type LeadStyle = "deck" | "lede" | "pullout";
const STYLES: LeadStyle[] = ["deck", "lede", "pullout"];

/**
 * newsletterLead — large opening paragraph (deck/lede/pullout).
 *
 * Content is inline-editable in the DOM. Distinct from the inline
 * `data-font-size="lead"` mark on TextStyleWithFontSize, which is now only
 * exposed in the lesson-blocks editor.
 */
export const NewsletterLead = Node.create({
  name: "newsletterLead",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      dropcap: {
        default: false,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-dropcap");
          if (v === "true") return true;
          if (v === "false") return false;
          return (el as HTMLElement).classList.contains("lede");
        },
      },
      style: {
        default: "deck" as LeadStyle,
        parseHTML: (el) => {
          const e = el as HTMLElement;
          const v = e.getAttribute("data-style");
          if (STYLES.includes(v as LeadStyle)) return v as LeadStyle;
          if (e.classList.contains("lede")) return "lede";
          if (e.classList.contains("pullout")) return "pullout";
          return "deck";
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: "p.deck" },
      { tag: "p.lede" },
      { tag: "p.lead" },
      { tag: "p.standfirst" },
      { tag: '[class*="lead-paragraph"]' },
      { tag: "[data-newsletter-lead]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = (node.attrs.style as LeadStyle) || "deck";
    const dropcap = node.attrs.dropcap === true;
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-lead": "true",
        "data-style": style,
        "data-dropcap": dropcap ? "true" : "false",
        class: `newsletter-lead newsletter-lead--${style}`,
      }),
      0,
    ];
  },
});
