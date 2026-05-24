import { Mark, mergeAttributes } from "@tiptap/core";

export type AccentColor =
  | "orange"
  | "forest"
  | "teal"
  | "plum"
  | "mustard"
  | "navy";
export type AccentStyle = "plain" | "italic" | "bold-italic";
export type AccentWeight = "normal" | "heavy";

const COLORS: AccentColor[] = [
  "orange",
  "forest",
  "teal",
  "plum",
  "mustard",
  "navy",
];
const STYLES: AccentStyle[] = ["plain", "italic", "bold-italic"];
const WEIGHTS: AccentWeight[] = ["normal", "heavy"];

interface AccentAttrs {
  color?: AccentColor;
  style?: AccentStyle;
  weight?: AccentWeight;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    accent: {
      setAccent: (attrs?: AccentAttrs) => ReturnType;
      unsetAccent: () => ReturnType;
      toggleAccent: (attrs?: AccentAttrs) => ReturnType;
    };
  }
}

const DEFAULTS: Required<AccentAttrs> = {
  color: "orange",
  style: "plain",
  weight: "normal",
};

function readAttrs(el: HTMLElement): Required<AccentAttrs> {
  const c = el.getAttribute("data-color") as AccentColor | null;
  const s = el.getAttribute("data-style") as AccentStyle | null;
  const w = el.getAttribute("data-weight") as AccentWeight | null;
  return {
    color: c && COLORS.includes(c) ? c : "orange",
    style: s && STYLES.includes(s) ? s : "plain",
    weight: w && WEIGHTS.includes(w) ? w : "normal",
  };
}

export const Accent = Mark.create({
  name: "accent",

  addAttributes() {
    return {
      color: {
        default: "orange" as AccentColor,
        parseHTML: (el) => readAttrs(el as HTMLElement).color,
      },
      style: {
        default: "plain" as AccentStyle,
        parseHTML: (el) => readAttrs(el as HTMLElement).style,
      },
      weight: {
        default: "normal" as AccentWeight,
        parseHTML: (el) => readAttrs(el as HTMLElement).weight,
      },
    };
  },

  parseHTML() {
    return [
      { tag: "span.accent", priority: 60 },
      { tag: "span[data-accent]", priority: 60 },
      { tag: "mark.accent", priority: 60 },
      { tag: "em.accent", priority: 60 },
    ];
  },

  renderHTML({ mark, HTMLAttributes }) {
    const color = (mark.attrs.color as AccentColor) || "orange";
    const style = (mark.attrs.style as AccentStyle) || "plain";
    const weight = (mark.attrs.weight as AccentWeight) || "normal";

    const classes = ["newsletter-accent", `newsletter-accent--${color}`];
    if (style === "italic") classes.push("newsletter-accent--italic");
    if (style === "bold-italic") classes.push("newsletter-accent--bold-italic");
    if (weight === "heavy") classes.push("newsletter-accent--heavy");

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-accent": "true",
        "data-color": color,
        "data-style": style,
        "data-weight": weight,
        class: classes.join(" "),
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAccent:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, { ...DEFAULTS, ...attrs }),
      unsetAccent:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
      toggleAccent:
        (attrs) =>
        ({ commands }) =>
          commands.toggleMark(this.name, { ...DEFAULTS, ...attrs }),
    };
  },
});
