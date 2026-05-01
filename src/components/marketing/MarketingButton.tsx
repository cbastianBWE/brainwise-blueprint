import { ReactNode, ElementType, CSSProperties } from "react";

type Variant = "primary" | "secondary" | "ghost" | "invert";
type Size = "sm" | "md" | "lg";

type Props = {
  variant?: Variant;
  size?: Size;
  as?: ElementType;
  to?: string;
  href?: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  fullWidth?: boolean;
  hideArrow?: boolean;
  onDark?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  [key: string]: any;
};

export default function MarketingButton({
  variant = "primary",
  size = "md",
  as,
  children,
  style,
  className = "",
  fullWidth,
  hideArrow,
  onDark,
  ...rest
}: Props) {
  const Tag: ElementType = as || (rest.to || rest.href ? "a" : "button");

  const classes = [
    "bw-btn",
    `bw-btn-${variant}`,
    `bw-btn-${size}`,
    fullWidth ? "bw-btn-fullwidth" : "",
    onDark && variant === "ghost" ? "bw-btn-on-dark" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const showArrow = !hideArrow && variant !== "ghost";

  return (
    <Tag className={classes} style={style} {...rest}>
      {children}
      {showArrow && <span className="bw-btn-arrow">→</span>}
    </Tag>
  );
}
