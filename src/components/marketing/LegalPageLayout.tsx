import { useEffect, useMemo, useRef, useState, CSSProperties } from "react";
import "@/styles/marketing-tokens.css";
import MarketingNav from "./MarketingNav";
import MarketingFooter from "./MarketingFooter";
import Eyebrow from "./Eyebrow";

export type LegalBlock =
  | { type: "h1"; text: string; id: string }
  | { type: "h2"; text: string; id: string }
  | { type: "h3"; text: string; id: string }
  | { type: "p"; text: string }
  | { type: "table"; header: string[]; body: string[][] };

interface LegalPageLayoutProps {
  title: string;
  effectiveDate: string;
  blocks: LegalBlock[];
}

function useIsBelow(width: number) {
  const [v, setV] = useState(typeof window !== "undefined" ? window.innerWidth < width : false);
  useEffect(() => {
    const onR = () => setV(window.innerWidth < width);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [width]);
  return v;
}

const headingScroll: CSSProperties = { scrollMarginTop: 90 };

function renderBlock(block: LegalBlock, index: number, total: number) {
  switch (block.type) {
    case "h1":
      return (
        <h2
          key={index}
          id={block.id}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 26,
            color: "var(--bw-navy)",
            margin: index === 0 ? "0 0 16px" : "48px 0 16px",
            ...headingScroll,
          }}
        >
          {block.text}
        </h2>
      );
    case "h2":
      return (
        <h3
          key={index}
          id={block.id}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: 19,
            color: "var(--bw-navy)",
            margin: "28px 0 10px",
            ...headingScroll,
          }}
        >
          {block.text}
        </h3>
      );
    case "h3":
      return (
        <h4
          key={index}
          id={block.id}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: 16,
            color: "var(--bw-slate-700)",
            margin: "20px 0 8px",
            ...headingScroll,
          }}
        >
          {block.text}
        </h4>
      );
    case "p":
      return (
        <p
          key={index}
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 400,
            fontSize: 15,
            lineHeight: 1.7,
            color: "var(--bw-slate-700)",
            marginBottom: 14,
          }}
        >
          {block.text}
        </p>
      );
    case "table":
      return (
        <table
          key={index}
          style={{
            width: "100%",
            borderCollapse: "collapse",
            margin: "20px 0",
            border: "1px solid var(--border-1)",
          }}
        >
          <thead>
            <tr>
              {block.header.map((h, i) => (
                <th
                  key={i}
                  style={{
                    background: "var(--bw-cream-200)",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--bw-navy)",
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border-1)",
                    textAlign: "left",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.body.map((row, ri) => {
              const isLast = ri === block.body.length - 1;
              return (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: ci === 0 ? 600 : 400,
                        fontSize: 14,
                        color: "var(--bw-slate-700)",
                        padding: "10px 14px",
                        borderBottom: isLast ? "none" : "1px solid var(--border-1)",
                        verticalAlign: "top",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
  }
}

export default function LegalPageLayout({ title, effectiveDate, blocks }: LegalPageLayoutProps) {
  const isMobile = useIsBelow(1024);
  const [activeId, setActiveId] = useState<string | null>(null);
  const proseRef = useRef<HTMLDivElement>(null);

  const tocEntries = useMemo(
    () => blocks.filter((b): b is Extract<LegalBlock, { type: "h1" }> => b.type === "h1"),
    [blocks]
  );

  useEffect(() => {
    if (!tocEntries.length) return;
    const elements = tocEntries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => !!el);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tocEntries]);

  const handleTocClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  };

  const handleBackToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const tocList = (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {tocEntries.map((entry) => {
        const isActive = activeId === entry.id;
        return (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              onClick={(e) => handleTocClick(e, entry.id)}
              className="bw-toc-link"
              style={{
                display: "block",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                padding: "6px 0",
                color: isActive ? "var(--bw-orange)" : "var(--bw-slate-500)",
                textDecoration: "none",
                lineHeight: 1.4,
                transition: "color 140ms",
              }}
            >
              {entry.text}
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="bw-marketing-root" style={{ background: "var(--bg-1)", minHeight: "100vh" }}>
      <style>{`.bw-toc-link:hover { color: var(--bw-orange) !important; }`}</style>
      <MarketingNav />

      {/* Header */}
      <header
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: isMobile ? "48px 24px 24px" : "72px 48px 32px",
        }}
      >
        <Eyebrow>Legal</Eyebrow>
        <h1
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: isMobile ? 32 : 40,
            color: "var(--bw-navy)",
            letterSpacing: "-0.02em",
            margin: "0 0 12px",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 500,
            fontSize: 12,
            color: "var(--bw-slate-500)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          Effective: {effectiveDate}
        </div>
      </header>

      {/* Body */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: isMobile ? "16px 24px 64px" : "32px 48px 96px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "240px 1fr",
          gap: isMobile ? 24 : 48,
          alignItems: "start",
        }}
      >
        {/* TOC */}
        {isMobile ? (
          <details
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--r-md)",
              padding: "12px 16px",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                color: "var(--bw-navy)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              On this page
            </summary>
            <nav style={{ marginTop: 12 }}>{tocList}</nav>
          </details>
        ) : (
          <aside
            style={{
              position: "sticky",
              top: 100,
              maxHeight: "calc(100vh - 120px)",
              overflowY: "auto",
              paddingRight: 8,
            }}
          >
            <div
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 11,
                color: "var(--bw-slate-500)",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                marginBottom: 12,
              }}
            >
              On this page
            </div>
            <nav>{tocList}</nav>
          </aside>
        )}

        {/* Prose well */}
        <div ref={proseRef} style={{ maxWidth: 720, width: "100%" }}>
          {blocks.map((b, i) => renderBlock(b, i, blocks.length))}

          <div style={{ marginTop: 56, paddingTop: 24, borderTop: "1px solid var(--border-1)" }}>
            <a
              href="#top"
              onClick={handleBackToTop}
              className="bw-toc-link"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                color: "var(--bw-slate-500)",
                textDecoration: "none",
              }}
            >
              ↑ Back to top
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
