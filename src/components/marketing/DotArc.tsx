import { CSSProperties } from "react";

interface Props {
  size?: number;
  opacity?: number;
  style?: CSSProperties;
}

export default function DotArc({ size = 480, opacity = 0.1, style }: Props) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        width: size,
        height: size,
        opacity,
        pointerEvents: "none",
        ...style,
      }}
    >
      <img src="/brain-icon.png" alt="" style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
