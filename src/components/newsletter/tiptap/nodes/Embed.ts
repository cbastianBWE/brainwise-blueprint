import { Node, mergeAttributes } from "@tiptap/core";
import { isSafeHttpUrl } from "@/lib/safeUrl";
import type { EmbedProvider } from "../types";

const PROVIDERS: EmbedProvider[] = ["youtube", "spotify", "vimeo", "generic"];

/**
 * Build the safe iframe src for an embed node.
 *
 * Provider templates are hard-coded; the doc only stores provider identifiers
 * and the provider-specific embed_id, never arbitrary iframe URLs. This makes
 * XSS via crafted src impossible for the three known providers and limits the
 * `generic` escape hatch to https URLs that pass the global safe-URL allowlist.
 *
 * Spotify: embed_id is "<kind>:<id>" where kind is one of episode|track|
 * playlist|album|show. Defaults to "episode" if no prefix is present.
 */
export function buildEmbedSrc(
  provider: EmbedProvider,
  embed_id: string,
  url: string,
): string {
  switch (provider) {
    case "youtube": {
      if (!embed_id) return "";
      const safeId = encodeURIComponent(embed_id);
      return `https://www.youtube-nocookie.com/embed/${safeId}`;
    }
    case "vimeo": {
      if (!embed_id) return "";
      const safeId = encodeURIComponent(embed_id);
      return `https://player.vimeo.com/video/${safeId}`;
    }
    case "spotify": {
      if (!embed_id) return "";
      const SPOTIFY_KINDS = new Set([
        "episode",
        "track",
        "playlist",
        "album",
        "show",
      ]);
      let kind = "episode";
      let id = embed_id;
      const sepIdx = embed_id.indexOf(":");
      if (sepIdx > 0) {
        const maybeKind = embed_id.slice(0, sepIdx);
        if (SPOTIFY_KINDS.has(maybeKind)) {
          kind = maybeKind;
          id = embed_id.slice(sepIdx + 1);
        }
      }
      const safeId = encodeURIComponent(id);
      return `https://open.spotify.com/embed/${kind}/${safeId}`;
    }
    case "generic": {
      if (!url) return "";
      if (!isSafeHttpUrl(url)) return "";
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return "";
        return parsed.toString();
      } catch {
        return "";
      }
    }
    default:
      return "";
  }
}

/**
 * newsletterEmbed — third-party media embed.
 *
 * renderHTML emits an <iframe> with an EMPTY src. The runtime layer (editor
 * NodeView in G4-A, reader in G6) calls buildEmbedSrc(provider, embed_id, url)
 * and assigns the result. This guarantees the iframe src is constructed from
 * a known-safe template, never copied verbatim from the doc.
 */
export const NewsletterEmbed = Node.create({
  name: "newsletterEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      provider: {
        default: "youtube" as EmbedProvider,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-provider");
          return PROVIDERS.includes(v as EmbedProvider)
            ? (v as EmbedProvider)
            : "youtube";
        },
      },
      embed_id: { default: "" },
      url: { default: "" },
      title: { default: null as string | null },
      aspect_ratio: {
        default: "16:9" as "16:9" | "4:3" | "1:1" | "9:16",
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-aspect-ratio");
          return ["16:9", "4:3", "1:1", "9:16"].includes(v || "")
            ? (v as "16:9" | "4:3" | "1:1" | "9:16")
            : "16:9";
        },
        renderHTML: (attrs) => ({
          "data-aspect-ratio": attrs.aspect_ratio,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-newsletter-embed]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const ar = el.getAttribute("data-aspect-ratio");
          return {
            provider: el.getAttribute("data-provider") || "youtube",
            embed_id: el.getAttribute("data-embed-id") || "",
            url: el.getAttribute("data-url") || "",
            title: el.getAttribute("data-title") || null,
            aspect_ratio: ["16:9", "4:3", "1:1", "9:16"].includes(ar || "")
              ? ar
              : "16:9",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const provider = (node.attrs.provider as EmbedProvider) || "youtube";
    const embed_id = (node.attrs.embed_id as string) || "";
    const url = (node.attrs.url as string) || "";
    const title = (node.attrs.title as string | null) || "";
    const aspectRatio =
      (node.attrs.aspect_ratio as "16:9" | "4:3" | "1:1" | "9:16") || "16:9";

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-embed": "true",
        "data-provider": provider,
        "data-embed-id": embed_id,
        "data-url": url,
        "data-title": title,
        "data-aspect-ratio": aspectRatio,
        class: "newsletter-embed",
      }),
      [
        "iframe",
        {
          // src intentionally empty — runtime populates via buildEmbedSrc()
          src: "",
          title,
          loading: "lazy",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowfullscreen: "true",
          referrerpolicy: "strict-origin-when-cross-origin",
          frameborder: "0",
        },
      ],
    ] as any;
  },
});
