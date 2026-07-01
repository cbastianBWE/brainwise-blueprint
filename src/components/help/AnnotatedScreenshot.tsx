import type { HelpHotspot } from "@/content/help/types";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  alt: string;
  hotspots?: HelpHotspot[];
  className?: string;
}

/**
 * Renders a screenshot with optional highlight overlays drawn on top.
 * Hotspot coordinates are percentages of the image's natural size (0-100),
 * so the overlay scales with the rendered image at any size.
 */
export function AnnotatedScreenshot({ src, alt, hotspots, className }: Props) {
  return (
    <div className={cn("relative inline-block max-w-2xl w-full", className)}>
      <img src={src} alt={alt} loading="lazy" className="w-full block" />
      {hotspots?.map((h, i) => {
        const isCircle = h.shape === "circle";
        return (
          <div
            key={i}
            className={cn(
              "absolute pointer-events-none border-2 border-primary",
              "shadow-[0_0_0_4px_hsl(var(--primary)/0.18),0_0_18px_hsl(var(--primary)/0.55)]",
              "animate-pulse",
              isCircle ? "rounded-full" : "rounded-md",
            )}
            style={{
              left: `${h.x}%`,
              top: `${h.y}%`,
              width: `${h.w}%`,
              height: `${h.h}%`,
            }}
          >
            {hotspots.length > 1 && (
              <span
                className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow"
                aria-hidden
              >
                {i + 1}
              </span>
            )}
            {h.label && (
              <span
                className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground shadow"
                aria-hidden
              >
                {h.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
