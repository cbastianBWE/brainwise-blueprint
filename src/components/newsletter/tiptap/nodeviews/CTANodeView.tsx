import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { isSafeHttpUrl } from "@/lib/safeUrl";
import { cn } from "@/lib/utils";
import type { CtaVariant } from "../nodes/CTA";

const VARIANTS: CtaVariant[] = ["primary", "secondary", "ghost"];
const VARIANT_LABEL: Record<CtaVariant, string> = {
  primary: "Primary",
  secondary: "Secondary",
  ghost: "Ghost",
};

export function CTANodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const variant = (node.attrs.variant as CtaVariant) || "primary";
  const label = (node.attrs.label as string) || "";
  const url = (node.attrs.url as string) || "";
  const trackingId = (node.attrs.tracking_id as string | null) ?? "";

  const urlInvalid = url.length > 0 && !isSafeHttpUrl(url);

  return (
    <NodeViewWrapper
      as="div"
      data-drag-handle
      data-newsletter-cta-edit
      className={cn(
        "my-3 rounded-xl border bg-[var(--bw-cream)] p-4 transition-colors",
        selected
          ? "border-[#F5741A]"
          : "border-[var(--border-1)]",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
          Call to action
        </span>
        <div className="flex items-center gap-1 rounded-full border border-[var(--border-1)] bg-white p-0.5">
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => updateAttributes({ variant: v })}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                variant === v
                  ? "bg-[#F5741A]/15 text-[#F5741A]"
                  : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
              )}
            >
              {VARIANT_LABEL[v]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <label className="grid gap-1">
          <span className="text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
            Label
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => updateAttributes({ label: e.target.value })}
            placeholder="Get started"
            className="h-8 rounded-md border border-[var(--border-1)] bg-white px-2 text-sm text-[var(--fg-1)] focus:border-[#F5741A] focus:outline-none"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
            URL
          </span>
          <input
            type="text"
            value={url}
            onChange={(e) => updateAttributes({ url: e.target.value })}
            placeholder="https://example.com/path"
            className={cn(
              "h-8 rounded-md border bg-white px-2 text-sm text-[var(--fg-1)] focus:outline-none",
              urlInvalid
                ? "border-red-500 focus:border-red-500"
                : "border-[var(--border-1)] focus:border-[#F5741A]",
            )}
          />
          {urlInvalid && (
            <span className="text-[11px] text-red-600">
              URL must start with http://, https://, mailto: or tel:
            </span>
          )}
        </label>

        <label className="grid gap-1">
          <span className="text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
            Tracking ID (optional)
          </span>
          <input
            type="text"
            value={trackingId}
            onChange={(e) =>
              updateAttributes({
                tracking_id: e.target.value.trim() === "" ? null : e.target.value,
              })
            }
            placeholder="cta_summer_promo"
            className="h-8 rounded-md border border-[var(--border-1)] bg-white px-2 text-sm text-[var(--fg-1)] focus:border-[#F5741A] focus:outline-none"
          />
          <span className="text-[11px] text-[var(--fg-3)]">
            Analytics consumption coming in a later release.
          </span>
        </label>
      </div>

      <div className="mt-3 border-t border-dashed border-[var(--border-1)] pt-3">
        <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
          Preview
        </span>
        <a
          href={isSafeHttpUrl(url) ? url : "#"}
          onClick={(e) => e.preventDefault()}
          data-newsletter-cta="true"
          data-variant={variant}
          className={`newsletter-cta newsletter-cta--${variant}`}
        >
          {label || "Button label"}
        </a>
      </div>
    </NodeViewWrapper>
  );
}
