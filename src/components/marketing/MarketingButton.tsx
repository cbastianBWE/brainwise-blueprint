import { CSSProperties, ElementType, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "invert";
type Size = "sm" | "md" | "lg";

interface Props {
  variant?: Variant;
  size?: Size;
  as?: ElementType;
  to?: string;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: (e: any) => void;
  children: ReactNode;
  style?: CSSProperties;
  fullWidth?: boolean;
  hideArrow?: boolean;
}

const sizeMap: Record<Size, CSSProperties> = {
  sm: { padding: "8px 16px", fontSize: 13 },
  md: { padding: "11px 22px", fontSize: 14 },
  lg: { padding: "15px 30px", fontSize: 15 },
};

function getVariantStyle(v: Variant): CSSProperties {
  // Use !important via string-with-suffix trick because Tailwind preflight
  // resets buttons and anchors to background-color: transparent / color: inherit,
  // which beats normal React inline styles in cascade order.
  const i = (val: string) => `${val} !important` as any;
  switch (v) {
    case "primary":
      return {
        background: i("var(--accent)"),
        color: i("#ffffff"),
        border: "1px solid var(--accent)",
        boxShadow: "var(--shadow-cta)",
      };
    case "secondary":
      return {
        background: i("var(--bw-navy)"),
        color: i("#ffffff"),
        border: "1px solid var(--bw-navy)",
      };
    case "ghost":
      return {
        background: i("transparent"),
        color: i("rgba(255,255,255,0.92)"),
        border: "1px solid rgba(255,255,255,0.32)",
      };
    case "invert":
      return {
        background: i("transparent"),
        color: i("#ffffff"),
        border: "1px solid rgba(255,255,255,0.55)",
      };
  }
}

export default function MarketingButton({
  variant = "primary",
  size = "md",
  as,
  children,
  style,
  fullWidth,
  hideArrow,
  ...rest
}: Props) {
  const Tag: ElementType = as || (rest.to || rest.href ? "a" : "button");
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 600,
    borderRadius: "var(--r-pill)",
    cursor: rest.disabled ? "not-allowed" : "pointer",
    opacity: rest.disabled ? 0.6 : 1,
    transition: "transform var(--dur-fast) var(--ease-standard), background var(--dur-fast)",
    textDecoration: "none",
    whiteSpace: "nowrap",
    width: fullWidth ? "100%" : undefined,
    letterSpacing: "0.01em",
    lineHeight: 1.1,
    ...sizeMap[size],
    ...getVariantStyle(variant),
    ...style,
  };
  const showArrow = !hideArrow && variant !== "ghost";
  return (
    <Tag {...rest} style={base}>
      {children}
      {showArrow && <span aria-hidden style={{ marginLeft: 2 }}>→</span>}
    </Tag>
  );
}
