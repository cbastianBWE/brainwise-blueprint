import type {
  OnePagerSection,
  OnePagerVoice,
  OnePagerVoiceLine,
} from "@/lib/pairedSectionTypes";
import {
  FacetChip,
  POPPINS,
  NAVY,
  TEAL,
  GRAY,
  PURPLE,
  AMBER,
  MUSTARD,
  ORANGE,
  type FacetEntry,
} from "@/components/results/pairedFacetChip";

const COLOR_A = NAVY;
const COLOR_B = MUSTARD;
const LINE = "rgba(2,31,54,.12)";

/* Fixed label order. Keys absent from the payload are skipped. */
const SHARED_LABELS: [keyof OnePagerSection["shared"], string][] = [
  ["strong", "What holds you together"],
  ["talk", "How you two talk"],
  ["fight", "What your fights turn into"],
  ["repair", "How the aftermath goes"],
];

const VOICE_LABELS: [keyof OnePagerVoice, string][] = [
  ["bring", "What I bring us"],
  ["need", "What I need from you"],
  ["talk", "How I show up in a hard talk"],
  ["clash", "What happens to me when we clash"],
  ["repair", "How I find my way back"],
  ["close", "How I feel closest to you"],
];

const lineText = (l: OnePagerVoiceLine | undefined): string => (l?.text ?? "").trim();

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: POPPINS,
        fontWeight: 700,
        fontSize: 8,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: ORANGE,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: POPPINS,
        fontWeight: 700,
        fontSize: 9.6,
        letterSpacing: ".02em",
        color: NAVY,
        margin: "9px 0 5px",
      }}
    >
      {children}
    </div>
  );
}

interface Props {
  data: OnePagerSection;
  firstA: string;
  firstB: string;
  /** Person A / Person B substitution used everywhere except the voice columns. */
  nm: (s: string) => string;
  lookupFacet: (name: string) => FacetEntry | undefined;
}

/**
 * Fixed two-sheet summary. Page one is deliberately dense: it is measured to sit
 * at ~91% of a US Letter sheet at the generator's word caps, so do not add
 * padding, type size or extra sections here without re-measuring.
 */
export default function PairedOnePager({ data, firstA, firstB, nm, lookupFacet }: Props) {
  const preview = Array.isArray(data.report_preview) ? data.report_preview.filter(Boolean) : [];
  const hasPage2 = preview.length > 0;
  const watch = Array.isArray(data.watch) ? data.watch.filter(Boolean) : [];
  const talkAbout = Array.isArray(data.talk_about) ? data.talk_about.filter(Boolean) : [];

  const VoiceCol = ({
    voice, who, heading,
  }: { voice: OnePagerVoice; who: "a" | "b"; heading: string }) => (
    <div
      className="op-avoid"
      style={{
        borderLeft: `3px solid ${who === "a" ? COLOR_A : COLOR_B}`,
        paddingLeft: 9,
      }}
    >
      <div
        style={{
          fontFamily: POPPINS,
          fontWeight: 700,
          fontSize: 8.6,
          color: who === "a" ? COLOR_A : COLOR_B,
          marginBottom: 5,
        }}
      >
        {heading}
      </div>
      {VOICE_LABELS.map(([key, label]) => {
        const text = lineText(voice?.[key]);
        if (!text) return null;
        return (
          <div key={key} style={{ marginBottom: 5 }}>
            <div
              style={{
                fontSize: 6.4,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: GRAY,
                marginBottom: 1,
              }}
            >
              {label}
            </div>
            {/* first person, quoted speech — no name substitution here by design */}
            <div style={{ fontSize: 8.3, lineHeight: 1.42, fontStyle: "italic", color: NAVY }}>
              {text}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      id="bw-one-pager"
      className="bw-one-pager"
      style={{
        background: "#fff",
        color: NAVY,
        fontFamily: "Montserrat, system-ui, sans-serif",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      } as React.CSSProperties}
    >
      {/* ============ PAGE ONE ============ */}
      <section className="op-page op-page-1" style={{ padding: "14mm 12mm" }}>
        <Eyebrow>
          {hasPage2
            ? "BrainWise · Paired Profile · Page one of two"
            : "BrainWise · Paired Profile · Page one"}
        </Eyebrow>
        <h1 style={{ fontFamily: POPPINS, fontWeight: 800, fontSize: 18, margin: "0 0 6px", color: NAVY }}>
          {nm(data.title ?? "")}
        </h1>

        {/* legend */}
        <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 8, color: GRAY, marginBottom: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: COLOR_A, display: "inline-block" }} />
            {firstA}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: COLOR_B, display: "inline-block" }} />
            {firstB}
          </span>
        </div>

        {data.opening && (
          <div
            className="op-avoid"
            style={{ borderLeft: `3px solid ${TEAL}`, paddingLeft: 9, fontSize: 8.8, lineHeight: 1.5 }}
          >
            {nm(data.opening)}
          </div>
        )}

        {/* shared */}
        <Head>What happens between you</Head>
        <div>
          {SHARED_LABELS.map(([key, label], i) => {
            const text = lineText(data.shared?.[key]);
            if (!text) return null;
            return (
              <div
                key={key}
                className="op-avoid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "52mm 1fr",
                  gap: 8,
                  padding: "4px 0",
                  borderTop: i === 0 ? "none" : `1px dotted ${LINE}`,
                }}
              >
                <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 8, color: NAVY }}>{label}</div>
                <div style={{ fontSize: 8.3, lineHeight: 1.45 }}>{nm(text)}</div>
              </div>
            );
          })}
        </div>

        {/* voices */}
        <Head>In your own words, to each other</Head>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <VoiceCol voice={data.a_to_b} who="a" heading={`In ${firstA}'s words, to ${firstB}`} />
          <VoiceCol voice={data.b_to_a} who="b" heading={`In ${firstB}'s words, to ${firstA}`} />
        </div>

        {/* watch */}
        {watch.length > 0 && (
          <>
            <Head>Keep an eye on</Head>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {watch.slice(0, 2).map((w, i) => (
                <div
                  key={i}
                  className="op-avoid"
                  style={{ borderLeft: `3px solid ${AMBER}`, paddingLeft: 9 }}
                >
                  <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 8.4, color: MUSTARD }}>
                    {nm(w.point ?? "")}
                  </div>
                  <div style={{ fontSize: 8.2, lineHeight: 1.45, marginTop: 2 }}>{nm(w.body ?? "")}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* talk about */}
        {talkAbout.length > 0 && (
          <>
            <Head>Talk about this together</Head>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
              {talkAbout.slice(0, 4).map((t, i) => (
                <div key={i} className="op-avoid" style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <span
                    style={{
                      flex: "0 0 auto",
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: PURPLE,
                      color: "#fff",
                      fontFamily: POPPINS,
                      fontWeight: 700,
                      fontSize: 8,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 8.3, lineHeight: 1.45 }}>{nm(t)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {data.disclaimer && (
          <div style={{ marginTop: 10, paddingTop: 6, borderTop: `1px solid ${LINE}`, fontSize: 6.4, color: GRAY, lineHeight: 1.45 }}>
            {nm(data.disclaimer)}
          </div>
        )}
      </section>

      {/* ============ PAGE TWO ============ */}
      {hasPage2 && (
        <section className="op-page op-page-2" style={{ padding: "14mm 12mm" }}>
          <Eyebrow>BrainWise · Paired Profile · Page two of two</Eyebrow>
          <h1 style={{ fontFamily: POPPINS, fontWeight: 800, fontSize: 18, margin: "0 0 6px", color: NAVY }}>
            What is in your full report
          </h1>
          <p style={{ fontSize: 8.6, lineHeight: 1.5, color: GRAY, margin: "0 0 10px", maxWidth: "80ch" }}>
            Page one is the short version. Your full report goes deeper on each of these, with the
            patterns behind them mapped question by question.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {preview.map((p, i) => (
              <div
                key={i}
                className="op-avoid"
                style={{ borderLeft: `3px solid ${TEAL}`, paddingLeft: 9, paddingBottom: 2 }}
              >
                <div style={{ display: "flex", gap: 7, alignItems: "baseline" }}>
                  <span style={{ fontFamily: POPPINS, fontWeight: 800, fontSize: 15, color: TEAL, lineHeight: 1 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 9, color: NAVY }}>
                    {nm(p.heading ?? p.section ?? "")}
                  </span>
                </div>
                <div style={{ fontSize: 8.1, lineHeight: 1.45, marginTop: 3 }}>{nm(p.text ?? "")}</div>
                {Array.isArray(p.facets) && p.facets.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                    {p.facets.map((f, j) => (
                      <FacetChip
                        key={`${f}-${j}`}
                        name={nm(f)}
                        entry={lookupFacet(f)}
                        firstA={firstA}
                        firstB={firstB}
                        delay={0}
                        size="sm"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
