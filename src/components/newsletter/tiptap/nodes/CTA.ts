import { Node, mergeAttributes } from "@tiptap/core";
import { isSafeHttpUrl } from "@/lib/safeUrl";

export type CtaVariant = "primary" | "secondary" | "ghost";
const VARIANTS: CtaVariant[] = ["primary", "secondary", "ghost"];

function clampVariant(v: string | null | undefined): CtaVariant {
  return VARIANTS.includes(v as CtaVariant) ? (v as CtaVariant) : "primary";
}

/**
 * newsletterCta — call-to-action atom (anchor block).
 *
 * Atom: no editable content; attrs only. parseHTML priority 60 keeps it
 * ahead of the Link mark's bare `<a>` rule via the scoped
 * `data-newsletter-cta` selector (§144). Render-time `href` is gated
 * through isSafeHttpUrl; unsafe URLs fall back to `#`.
 */
export const NewsletterCta = Node.create({
  name: "newsletterCta",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      variant: {
        default: "primary" as CtaVariant,
        parseHTML: (el) =>
          clampVariant((el as HTMLElement).getAttribute("data-variant")),
        renderHTML: (attrs) => ({
          "data-variant": clampVariant(attrs.variant as string),
        }),
      },
      label: {
        default: "",
        parseHTML: (el) => ((el as HTMLElement).textContent ?? "").trim(),
      },
      url: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("href") ?? "",
      },
      tracking_id: {
        default: null as string | null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-tracking-id");
          return v && v.length > 0 ? v : null;
        },
        renderHTML: (attrs) =>
          attrs.tracking_id
            ? { "data-tracking-id": String(attrs.tracking_id) }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-newsletter-cta]", priority: 60 }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = clampVariant(node.attrs.variant as string);
    const label = (node.attrs.label as string) || "";
    const rawUrl = (node.attrs.url as string) || "";
    const safe = isSafeHttpUrl(rawUrl) ? rawUrl : "#";
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-cta": "true",
        "data-variant": variant,
        href: safe,
        rel: "noopener noreferrer",
        class: `newsletter-cta newsletter-cta--${variant}`,
      }),
      label,
    ];
  },
});
