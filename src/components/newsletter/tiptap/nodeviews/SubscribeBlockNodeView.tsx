import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

/**
 * Editor-only static preview of the SubscribeForm. All controls are disabled
 * and the Turnstile script is NOT loaded here. The reader path mounts the
 * real <SubscribeForm /> through SubscribeBlockReaderNodeView.
 */
export function SubscribeBlockNodeView({ selected }: NodeViewProps) {
  return (
    <NodeViewWrapper
      as="div"
      data-drag-handle
      data-newsletter-subscribe-block-edit
      className="my-3"
    >
      <div
        className="relative rounded-2xl border p-7"
        style={{
          background: "var(--bw-cream, #FBF7F1)",
          borderColor: selected ? "#F5741A" : "rgba(0,0,0,0.06)",
        }}
      >
        <span className="absolute right-3 top-3 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--fg-3)]">
          Preview only — not interactive
        </span>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="email"
            placeholder="you@example.com"
            disabled
            aria-hidden="true"
            tabIndex={-1}
            className="h-11 min-w-0 flex-1 cursor-not-allowed rounded-md border border-black/10 bg-white px-3.5 text-sm text-[var(--bw-navy)] opacity-70"
          />
          <button
            type="button"
            disabled
            aria-hidden="true"
            tabIndex={-1}
            className="h-11 cursor-not-allowed rounded-md border-0 bg-[var(--bw-orange)] px-5 text-[13px] font-bold uppercase tracking-[0.06em] text-white opacity-70"
          >
            Subscribe
          </button>
        </div>

        <div
          className="mt-3.5 flex h-[65px] items-center justify-center rounded border border-dashed border-black/15 bg-white/40 text-[11px] text-[var(--fg-3)]"
          aria-hidden="true"
        >
          Turnstile widget (loads in reader)
        </div>

        <p className="mt-3 text-[11px] leading-[1.5] text-black/50">
          Double opt-in. Unsubscribe anytime. We never share your email.
        </p>
      </div>
    </NodeViewWrapper>
  );
}
