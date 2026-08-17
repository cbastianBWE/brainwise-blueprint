import { CSSProperties, useEffect, useState } from "react";
import { initialsOf } from "@/lib/publicDirectory";

interface Props {
  /** Resolved public URL, or null when there is no headshot. */
  src: string | null;
  name: string;
  /** Rendered square size in px. */
  size: number;
  /** Circle (cards, hero) or rounded square. */
  shape?: "circle" | "square";
  fontSize?: number;
  loading?: "lazy" | "eager";
  /** Palette for the initials fallback. */
  tone?: "light" | "dark";
  /** Crop anchor. Defaults to the face-safe "center 20%". */
  objectPosition?: string;
  style?: CSSProperties;

}

/**
 * Renders a practitioner headshot in a fixed frame that never squashes or
 * crops the top of the head, with an initials fallback when the image is
 * missing or fails to load.
 */
export default function PractitionerHeadshot({
  src,
  name,
  size,
  shape = "circle",
  fontSize,
  loading = "lazy",
  tone = "light",
  style,
}: Props) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src]);

  const radius = shape === "circle" ? "50%" : "var(--r-md)";
  const frame: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    flexShrink: 0,
    borderRadius: radius,
    overflow: "hidden",
    ...style,
  };

  if (!src || errored) {
    return (
      <div
        style={{
          ...frame,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: tone === "dark" ? "rgba(255,255,255,0.08)" : "var(--bw-cream)",
          border:
            tone === "dark"
              ? "1px solid rgba(255,255,255,0.2)"
              : "1px solid var(--bw-cream-300)",
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: fontSize ?? Math.round(size * 0.3),
          color: tone === "dark" ? "#fff" : "var(--bw-navy)",
        }}
        aria-label={name}
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    <div style={frame}>
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        loading={loading}
        onError={() => setErrored(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 20%",
          display: "block",
        }}
      />
    </div>
  );
}
