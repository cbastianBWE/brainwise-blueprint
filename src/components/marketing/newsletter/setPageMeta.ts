/**
 * Tiny client-side meta-tag helper for marketing pages. Upserts <title>,
 * meta tags (by name/property), <link rel="canonical">, and a JSON-LD
 * script tag by id. Returns a cleanup function that restores the prior
 * <title>; meta/link/script remain until the next setPageMeta call
 * upserts them (dedupes naturally).
 *
 * Caveat: client-side only. Social-preview crawlers (LinkedIn, Slack,
 * Facebook) do NOT execute JS and will see the static <head> from
 * index.html. SSR is required for accurate social previews (G3).
 */
export interface PageMetaInput {
  title: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogUrl?: string;
  ogImage?: string | null;
  twitterCard?: "summary" | "summary_large_image";
  extra?: Array<{ name?: string; property?: string; content: string }>;
  jsonLd?: { id: string; data: Record<string, unknown> } | null;
}

function upsertMeta(name: string, content: string, attr: "name" | "property") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function setPageMeta(meta: PageMetaInput): () => void {
  const prevTitle = document.title;
  document.title = meta.title;
  if (meta.description) upsertMeta("description", meta.description, "name");
  if (meta.canonical) upsertCanonical(meta.canonical);
  if (meta.ogTitle) upsertMeta("og:title", meta.ogTitle, "property");
  if (meta.ogDescription) upsertMeta("og:description", meta.ogDescription, "property");
  if (meta.ogType) upsertMeta("og:type", meta.ogType, "property");
  if (meta.ogUrl) upsertMeta("og:url", meta.ogUrl, "property");
  if (meta.ogImage) upsertMeta("og:image", meta.ogImage, "property");
  if (meta.twitterCard) upsertMeta("twitter:card", meta.twitterCard, "name");
  if (meta.extra) {
    for (const e of meta.extra) {
      if (e.name) upsertMeta(e.name, e.content, "name");
      else if (e.property) upsertMeta(e.property, e.content, "property");
    }
  }

  let scriptId: string | null = null;
  if (meta.jsonLd) {
    scriptId = meta.jsonLd.id;
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(meta.jsonLd.data);
  }

  return () => {
    document.title = prevTitle;
    if (scriptId) {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    }
  };
}
