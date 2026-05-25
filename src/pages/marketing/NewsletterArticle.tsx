import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import "@/styles/marketing-tokens.css";
import "@/styles/newsletter-prose.css";

import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import Eyebrow from "@/components/marketing/Eyebrow";
import SubscribeForm from "@/components/marketing/newsletter/SubscribeForm";
import PaywallCard from "@/components/marketing/newsletter/PaywallCard";
import NewsletterArticleCard, {
  type ArchiveItem,
} from "@/components/marketing/newsletter/NewsletterArticleCard";
import { setPageMeta } from "@/components/marketing/newsletter/setPageMeta";
import { buildExtensions } from "@/components/newsletter/tiptap";
import { useNewsletterImageUrl } from "@/components/newsletter/editor/useNewsletterImageUrl";
import ImageReaderNodeView from "@/components/marketing/newsletter/reader-nodeviews/ImageReaderNodeView";
import EmbedReaderNodeView from "@/components/marketing/newsletter/reader-nodeviews/EmbedReaderNodeView";
import SubscribeBlockReaderNodeView from "@/components/marketing/newsletter/reader-nodeviews/SubscribeBlockReaderNodeView";
import RelatedArticlesReaderNodeView from "@/components/marketing/newsletter/reader-nodeviews/RelatedArticlesReaderNodeView";
import FootnotesReaderNodeView from "@/components/marketing/newsletter/reader-nodeviews/FootnotesReaderNodeView";
import type { NewsletterTipTapDoc } from "@/components/newsletter/tiptap/types";

type AuthorLite = { user_id?: string; display_name: string | null; avatar_url?: string | null };

interface GrantedArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_tiptap: NewsletterTipTapDoc | null;
  cover_asset_id: string | null;
  og_image_asset_id: string | null;
  gate: "public" | "subscribers" | "plan_tier";
  allowed_plan_tiers: string[] | null;
  published_at: string;
  word_count: number | null;
  read_time_minutes: number | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
}

interface PaywallArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_asset_id: string | null;
  published_at: string;
  gate: "subscribers" | "plan_tier";
  allowed_plan_tiers: string[] | null;
}

type ReaderResponse =
  | { access: "not_found" }
  | { access: "granted"; article: GrantedArticle; authors: AuthorLite[] }
  | {
      access: "paywall";
      article: PaywallArticle;
      authors_lite: AuthorLite[];
      paywall_reason: "subscriber_required" | "plan_tier_required";
    };

function useIsBelow(w: number) {
  const [v, setV] = useState(typeof window !== "undefined" ? window.innerWidth < w : false);
  useEffect(() => {
    const onR = () => setV(window.innerWidth < w);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [w]);
  return v;
}

export default function NewsletterArticle() {
  const { slug = "" } = useParams<{ slug: string }>();
  const isMobile = useIsBelow(768);
  const padX = isMobile ? 20 : 48;

  const articleQuery = useQuery({
    queryKey: ["newsletter-article", slug],
    enabled: !!slug,
    queryFn: async (): Promise<ReaderResponse> => {
      const { data, error } = await supabase.rpc("get_article_for_reader", {
        p_slug: slug,
      });
      if (error) throw error;
      return data as unknown as ReaderResponse;
    },
  });

  const resp = articleQuery.data;

  if (articleQuery.isLoading || !resp) {
    return (
      <div style={{ background: "#fff", minHeight: "100vh" }}>
        <MarketingNav />
        <div style={{ padding: "80px 20px", textAlign: "center", color: "rgba(0,0,0,0.5)" }}>
          Loading…
        </div>
        <MarketingFooter />
      </div>
    );
  }

  if (resp.access === "not_found") {
    return <NotFoundView padX={padX} />;
  }

  if (resp.access === "paywall") {
    return (
      <PaywallView
        article={resp.article}
        authors={resp.authors_lite}
        reason={resp.paywall_reason}
        padX={padX}
        isMobile={isMobile}
      />
    );
  }

  return (
    <GrantedView
      article={resp.article}
      authors={resp.authors}
      padX={padX}
      isMobile={isMobile}
    />
  );
}

// ---------- Sub-views ----------

function NotFoundView({ padX }: { padX: number }) {
  useEffect(() => {
    return setPageMeta({
      title: "Article not found — BrainWise Newsletter",
      description: "The requested newsletter article could not be found.",
    });
  }, []);
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <MarketingNav />
      <div
        style={{
          padding: `120px ${padX}px`,
          textAlign: "center",
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: 36,
            color: "var(--bw-navy)",
            margin: "0 0 16px",
          }}
        >
          Article not found
        </h1>
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 15,
            color: "rgba(0,0,0,0.65)",
            margin: "0 0 28px",
          }}
        >
          The article you're looking for may have been moved, unpublished, or never existed.
        </p>
        <Link
          to="/newsletter"
          style={{
            background: "var(--bw-orange)",
            color: "#fff",
            padding: "12px 22px",
            borderRadius: 8,
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Back to newsletter
        </Link>
      </div>
      <MarketingFooter />
    </div>
  );
}

function ArticleHero({
  title,
  excerpt,
  coverAssetId,
  authors,
  publishedAt,
  readTime,
  isMobile,
  padX,
}: {
  title: string;
  excerpt: string | null;
  coverAssetId: string | null;
  authors: AuthorLite[];
  publishedAt: string;
  readTime?: number | null;
  isMobile: boolean;
  padX: number;
}) {
  const { url: coverUrl } = useNewsletterImageUrl(coverAssetId);
  const byline = authors.map((a) => a.display_name).filter(Boolean).join(", ") || "BrainWise";

  return (
    <header style={{ background: "#fff" }}>
      {coverUrl && (
        <div
          style={{
            width: "100%",
            aspectRatio: isMobile ? "4 / 3" : "21 / 9",
            background: `center/cover no-repeat url("${coverUrl}")`,
          }}
        />
      )}
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: `${isMobile ? 40 : 64}px ${padX}px ${isMobile ? 24 : 32}px`,
          textAlign: "left",
        }}
      >
        <Eyebrow>
          {byline} · {format(new Date(publishedAt), "MMM d, yyyy")}
          {readTime ? ` · ${readTime} min read` : ""}
        </Eyebrow>
        <h1
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: isMobile ? 34 : 52,
            lineHeight: 1.1,
            color: "var(--bw-navy)",
            letterSpacing: "-0.02em",
            margin: "18px 0 18px",
          }}
        >
          {title}
        </h1>
        {excerpt && (
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: isMobile ? 17 : 19,
              lineHeight: 1.55,
              color: "rgba(0,0,0,0.7)",
              margin: 0,
            }}
          >
            {excerpt}
          </p>
        )}
      </div>
    </header>
  );
}

function PaywallView({
  article,
  authors,
  reason,
  padX,
  isMobile,
}: {
  article: PaywallArticle;
  authors: AuthorLite[];
  reason: "subscriber_required" | "plan_tier_required";
  padX: number;
  isMobile: boolean;
}) {
  useEffect(() => {
    return setPageMeta({
      title: `${article.title} — BrainWise Newsletter`,
      description: article.excerpt ?? "Subscribe to read this article.",
      canonical: `https://brainwiseenterprises.com/newsletter/${article.slug}`,
      ogTitle: article.title,
      ogDescription: article.excerpt ?? "",
      ogType: "article",
      ogUrl: `https://brainwiseenterprises.com/newsletter/${article.slug}`,
      twitterCard: "summary_large_image",
    });
  }, [article]);

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <MarketingNav />
      <ArticleHero
        title={article.title}
        excerpt={article.excerpt}
        coverAssetId={article.cover_asset_id}
        authors={authors}
        publishedAt={article.published_at}
        isMobile={isMobile}
        padX={padX}
      />
      <div style={{ padding: `0 ${padX}px ${isMobile ? 56 : 88}px` }}>
        <PaywallCard
          paywallReason={reason}
          allowedPlanTiers={article.allowed_plan_tiers}
          slug={article.slug}
        />
      </div>
      <MarketingFooter />
    </div>
  );
}

function GrantedView({
  article,
  authors,
  padX,
  isMobile,
}: {
  article: GrantedArticle;
  authors: AuthorLite[];
  padX: number;
  isMobile: boolean;
}) {
  const { url: ogImageUrl } = useNewsletterImageUrl(
    article.og_image_asset_id ?? article.cover_asset_id,
  );

  useEffect(() => {
    return setPageMeta({
      title: `${article.seo_title || article.title} — BrainWise Newsletter`,
      description: article.seo_description || article.excerpt || "",
      canonical:
        article.canonical_url || `https://brainwiseenterprises.com/newsletter/${article.slug}`,
      ogTitle: article.seo_title || article.title,
      ogDescription: article.seo_description || article.excerpt || "",
      ogType: "article",
      ogUrl: `https://brainwiseenterprises.com/newsletter/${article.slug}`,
      ogImage: ogImageUrl,
      twitterCard: "summary_large_image",
      extra: [
        { property: "article:published_time", content: article.published_at },
        ...(authors.length
          ? [
              {
                property: "article:author",
                content: authors.map((a) => a.display_name).filter(Boolean).join(", "),
              },
            ]
          : []),
      ],
      jsonLd: {
        id: "newsletter-article-jsonld",
        data: {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: article.title,
          description: article.excerpt,
          image: ogImageUrl || undefined,
          datePublished: article.published_at,
          author: authors.map((a) => ({
            "@type": "Person",
            name: a.display_name ?? "BrainWise",
          })),
          publisher: {
            "@type": "Organization",
            name: "BrainWise Enterprises",
            logo: {
              "@type": "ImageObject",
              url: "https://brainwiseenterprises.com/brain-icon.png",
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `https://brainwiseenterprises.com/newsletter/${article.slug}`,
          },
        },
      },
    });
  }, [article, ogImageUrl, authors]);

  const extensions = useMemo(() => {
    const base = buildExtensions({ editable: false });
    return base.map((ext) => {
      if (ext.name === "newsletterImage") {
        return ext.extend({
          addNodeView: () => ReactNodeViewRenderer(ImageReaderNodeView),
        });
      }
      if (ext.name === "newsletterEmbed") {
        return ext.extend({
          addNodeView: () => ReactNodeViewRenderer(EmbedReaderNodeView),
        });
      }
      if (ext.name === "newsletterSubscribeBlock") {
        return ext.extend({
          addNodeView: () => ReactNodeViewRenderer(SubscribeBlockReaderNodeView),
        });
      }
      if (ext.name === "newsletterRelatedArticles") {
        return ext.extend({
          addOptions() {
            return { sourceArticleId: article.id };
          },
          addNodeView: () => ReactNodeViewRenderer(RelatedArticlesReaderNodeView),
        });
      }
      return ext;
    });
  }, [article.id]);

  const editor = useEditor(
    {
      extensions,
      content: article.body_tiptap ?? { type: "doc", content: [{ type: "paragraph" }] },
      editable: false,
    },
    [article.id, extensions],
  );

  // Related articles
  const relatedQuery = useQuery({
    queryKey: ["newsletter-related", article.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_articles_for_archive", {
        p_gate_filter: null,
        p_limit: 4,
        p_offset: 0,
      });
      if (error) throw error;
      return data as unknown as { items: ArchiveItem[] };
    },
  });
  const related = (relatedQuery.data?.items ?? []).filter((i) => i.id !== article.id).slice(0, 3);

  const articleStyle: CSSProperties = {
    maxWidth: 720,
    margin: "0 auto",
    padding: `${isMobile ? 16 : 32}px ${padX}px ${isMobile ? 56 : 88}px`,
  };

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <MarketingNav />

      <ArticleHero
        title={article.title}
        excerpt={article.excerpt}
        coverAssetId={article.cover_asset_id}
        authors={authors}
        publishedAt={article.published_at}
        readTime={article.read_time_minutes}
        isMobile={isMobile}
        padX={padX}
      />

      <article style={articleStyle}>
        {article.body_tiptap ? (
          <div className="newsletter-prose">
            <EditorContent editor={editor} />
          </div>
        ) : (
          <p style={{ color: "rgba(0,0,0,0.5)", fontStyle: "italic" }}>
            This article has no body yet.
          </p>
        )}

        {/* Author byline footer */}
        <div
          style={{
            marginTop: 56,
            paddingTop: 32,
            borderTop: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {authors.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {a.avatar_url ? (
                <img
                  src={a.avatar_url}
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--bw-navy)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {(a.display_name ?? "B").charAt(0)}
                </div>
              )}
              <div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--bw-navy)",
                  }}
                >
                  {a.display_name ?? "BrainWise"}
                </div>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 12,
                    color: "rgba(0,0,0,0.5)",
                  }}
                >
                  Contributor
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>

      {/* Subscribe CTA */}
      <section
        style={{
          background: "var(--bw-cream, #FBF7F1)",
          padding: `${isMobile ? 48 : 72}px ${padX}px`,
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: isMobile ? 24 : 28,
              color: "var(--bw-navy)",
              margin: "0 0 10px",
            }}
          >
            Get the next one in your inbox
          </h2>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 15,
              color: "rgba(0,0,0,0.65)",
              margin: "0 0 24px",
            }}
          >
            Field notes on behavior change, leadership, and applied neuroscience.
          </p>
          <SubscribeForm source="article_footer" variant="inline" />
        </div>
      </section>

      {/* More from the newsletter */}
      {related.length > 0 && (
        <section style={{ padding: `${isMobile ? 56 : 88}px ${padX}px` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Eyebrow>More from the newsletter</Eyebrow>
            <div
              style={{
                marginTop: 24,
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                gap: 24,
              }}
            >
              {related.map((it) => (
                <NewsletterArticleCard key={it.id} item={it} />
              ))}
            </div>
          </div>
        </section>
      )}

      <MarketingFooter />
    </div>
  );
}
