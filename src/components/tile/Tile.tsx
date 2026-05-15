import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CircleCheck,
  Award,
  CircleDot,
  FileText,
  Video,
  BookOpen,
  Wrench,
  LayoutTemplate,
  Lock,
  ExternalLink,
} from "lucide-react";
import type {
  TileVariant,
  CompletionStatus,
  RequiredState,
  ResourceContentType,
  InstrumentCode,
} from "./tileVariants";
import {
  INSTRUMENT_BADGE_LABEL,
  INSTRUMENT_BADGE_BG,
  CONTENT_ITEM_TYPE_LABEL,
} from "./tileVariants";

export interface TileProps {
  variant: TileVariant;
  name: string;
  summary?: string | null;
  thumbnailUrl?: string | null;
  status?: CompletionStatus;
  required?: RequiredState;
  contentType?: ResourceContentType;
  instrumentCodes?: InstrumentCode[];
  prerequisiteName?: string | null;
  estimatedMinutes?: number | null;
  itemType?: string;
  onClick?: () => void;
  detailPageMode?: boolean;
  isCurrentLocation?: boolean;
  inlineCtaLabel?: string;
  onInlineCtaClick?: () => void;
  locked?: boolean;
  externalLink?: boolean;
}

function contentTypeChipFor(ct: ResourceContentType) {
  switch (ct) {
    case "article":
      return { Icon: FileText, label: "Article" };
    case "video":
      return { Icon: Video, label: "Video" };
    case "guide":
      return { Icon: BookOpen, label: "Guide" };
    case "worksheet":
      return { Icon: Wrench, label: "Worksheet" };
    case "template":
      return { Icon: LayoutTemplate, label: "Template" };
  }
}

export function Tile(props: TileProps) {
  const {
    variant,
    name,
    summary,
    thumbnailUrl,
    status,
    required,
    contentType,
    instrumentCodes,
    prerequisiteName,
    estimatedMinutes,
    itemType,
    onClick,
    detailPageMode = false,
    isCurrentLocation = false,
    inlineCtaLabel,
    onInlineCtaClick,
    locked = false,
  } = props;

  const [isHovered, setIsHovered] = useState(false);
  const interactive = typeof onClick === "function";

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow",
        interactive && "cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCurrentLocation && "border-l-[3px] border-l-[var(--bw-orange)]",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick!();
              }
            }
          : undefined
      }
    >
      {/* Image area: 16:9 aspect ratio */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Fallback to placeholder on 403 (legacy thumbnails in private bucket)
              // or any other load error.
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}

        {/* Placeholder shown when no thumbnail. The BrainWise orange swirl. */}
        {!thumbnailUrl && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: "var(--bw-cream)" }}
          >
            <div
              className="h-12 w-12 rounded-full"
              style={{ backgroundColor: "var(--bw-orange)" }}
              aria-hidden="true"
            />
          </div>
        )}

        {/* Top-left: instrument badges (cert_path variant only) */}
        {variant === "cert_path" &&
          instrumentCodes &&
          instrumentCodes.length > 0 && (
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              {instrumentCodes.map((code) => (
                <span
                  key={code}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: INSTRUMENT_BADGE_BG[code],
                    color: "#FFFFFF",
                  }}
                >
                  {INSTRUMENT_BADGE_LABEL[code]}
                </span>
              ))}
            </div>
          )}

        {/* Bottom-right: status pill or content-type pill */}
        {variant === "resource" && contentType && (
          <div className="absolute bottom-2 right-2">
            <ResourceContentTypePill contentType={contentType} />
          </div>
        )}
        {variant !== "resource" && status && (
          <div className="absolute bottom-2 right-2">
            <StatusPill status={status} isCertPath={variant === "cert_path"} />
          </div>
        )}

        {/* Hover overlay (non-detailPageMode, interactive, not locked) */}
        {!detailPageMode && interactive && isHovered && !locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity">
            <span className="rounded-full bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow">
              {hoverCtaLabelFor(variant, status)}
            </span>
          </div>
        )}

        {/* Locked overlay */}
        {locked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Lock className="h-8 w-8 text-foreground drop-shadow" aria-label="Locked" />
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="truncate text-sm font-semibold leading-tight">{name}</h3>

        {summary && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{summary}</p>
        )}

        {/* Bottom metadata row — variant-dependent. Resources have no bottom row. */}
        {variant !== "resource" && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {required && <RequiredOptionalChip state={required} />}

            {variant === "cert_path" && prerequisiteName && (
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Requires: {prerequisiteName}
              </span>
            )}

            {(variant === "curriculum" || variant === "module") &&
              estimatedMinutes != null && (
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {estimatedMinutes} min
                </span>
              )}

            {variant === "content_item" &&
              itemType &&
              CONTENT_ITEM_TYPE_LABEL[itemType] && (
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {CONTENT_ITEM_TYPE_LABEL[itemType]}
                </span>
              )}
          </div>
        )}

        {/* Inline CTA */}
        {inlineCtaLabel && onInlineCtaClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInlineCtaClick();
            }}
            className="mt-2 rounded border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            {inlineCtaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  status,
  isCertPath,
}: {
  status: CompletionStatus;
  isCertPath: boolean;
}) {
  if (!status) return null;

  if (status === "in_progress") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: "var(--bw-amber)", color: "#FFFFFF" }}
      >
        <CircleDot className="h-3 w-3" />
        In progress
      </span>
    );
  }

  if (isCertPath) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: "var(--bw-plum)", color: "#FFFFFF" }}
      >
        <Award className="h-3 w-3" />
        Certified
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: "var(--bw-forest)", color: "#FFFFFF" }}
    >
      <CircleCheck className="h-3 w-3" />
      Completed
    </span>
  );
}

function ResourceContentTypePill({
  contentType,
}: {
  contentType: ResourceContentType;
}) {
  const { Icon, label } = contentTypeChipFor(contentType);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function RequiredOptionalChip({ state }: { state: "required" | "optional" }) {
  if (state === "required") {
    return (
      <span
        className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: "var(--bw-orange)", color: "#FFFFFF" }}
      >
        Required
      </span>
    );
  }
  return (
    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      Optional
    </span>
  );
}

function hoverCtaLabelFor(
  variant: TileVariant,
  status: CompletionStatus | undefined,
): string {
  if (variant === "resource") return "Open";
  if (status === "completed") return "Review";
  if (status === "in_progress") return "Resume";
  return "Start";
}
