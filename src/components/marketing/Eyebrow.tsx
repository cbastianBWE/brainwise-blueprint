import { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}

export default function Eyebrow({ children, color = "var(--bw-orange)", style }: Props) {
  return (
    <div
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color,
        marginBottom: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
