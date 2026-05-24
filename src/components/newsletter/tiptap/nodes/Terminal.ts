import { Node, mergeAttributes } from "@tiptap/core";
import type { TerminalCommand } from "../types";

function sanitizeCommands(raw: unknown): TerminalCommand[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      prompt: typeof c.prompt === "string" ? c.prompt : "$",
      command: typeof c.command === "string" ? c.command : "",
      output: typeof c.output === "string" ? c.output : "",
    }));
}

/**
 * newsletterTerminal — atom block with a structured commands[] attr
 * serialized via data-commands JSON. Same pattern as Byline.entries.
 */
export const NewsletterTerminal = Node.create({
  name: "newsletterTerminal",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      commands: {
        default: [] as TerminalCommand[],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-commands");
          if (!raw) return [];
          try {
            return sanitizeCommands(JSON.parse(raw));
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-commands": JSON.stringify(attrs.commands || []),
        }),
      },
      theme: {
        default: "dark",
        parseHTML: (el) => {
          const v = el.getAttribute("data-theme");
          return v === "light" ? "light" : "dark";
        },
        renderHTML: (attrs) => ({ "data-theme": attrs.theme }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-newsletter-terminal]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const raw = el.getAttribute("data-commands") || "[]";
          let commands: TerminalCommand[] = [];
          try {
            commands = sanitizeCommands(JSON.parse(raw));
          } catch {
            commands = [];
          }
          return {
            commands,
            theme:
              el.getAttribute("data-theme") === "light" ? "light" : "dark",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const commands = (node.attrs.commands as TerminalCommand[]) || [];
    const theme = (node.attrs.theme as string) || "dark";

    const inner: unknown[] = [];
    commands.forEach((c) => {
      const line: unknown[] = [
        "div",
        { class: "newsletter-terminal__line" },
        ["span", { class: "newsletter-terminal__prompt" }, c.prompt || "$"],
        ["span", { class: "newsletter-terminal__command" }, c.command || ""],
      ];
      if (c.output) {
        line.push([
          "pre",
          { class: "newsletter-terminal__output" },
          c.output,
        ]);
      }
      inner.push(line);
    });

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-terminal": "true",
        "data-theme": theme,
        "data-commands": JSON.stringify(commands),
        class: `newsletter-terminal newsletter-terminal--${theme}`,
      }),
      ...inner,
    ] as never;
  },
});
