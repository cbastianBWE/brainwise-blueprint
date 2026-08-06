import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type {
  OnePagerSection,
  OnePagerVoice,
  OnePagerVoiceLine,
} from "@/lib/pairedSectionTypes";
import {
  FacetChip,
  DIM_COLOR,
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
import { generatePairedOnePagerPdf } from "@/lib/generatePairedOnePagerPdf";

const COLOR_A = NAVY;
const COLOR_B = MUSTARD;

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

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: POPPINS,
        fontWeight: 700,
        fontSize: 11,
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
        fontSize: 15,
        color: NAVY,
        margin: "18px 0 8px",
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
  /** relationship mode — display labels only, never lookups */
  mode?: string | null;
  lookupFacet: (name: string) => FacetEntry | undefined;
  dateGenerated?: string;
  /** the first watch card is the protective driver when the pair has one */
  protectiveFirst?: boolean;
}

/**
 * Dialog entry point for the paired one-pager, mirroring PtpOnePagers:
 * read it here, or download the branded two-page PDF.
 */
export default function PairedOnePager({
  data,
  firstA,
  firstB,
  nm,
  mode,
  lookupFacet,
  dateGenerated,
  protectiveFirst,
}: Props) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<null | "summary" | "full">(null);

  const preview = Array.isArray(data.report_preview) ? data.report_preview.filter(Boolean) : [];
  const talkAbout = Array.isArray(data.talk_about) ? data.talk_about.filter(Boolean) : [];
  const watch = Array.isArray(data.watch) ? data.watch.filter(Boolean) : [];
  const hasPage2 = preview.length > 0 || talkAbout.length > 0;

  const download = async (scope: "summary" | "full") => {
    setDownloading(scope);
    try {
      await generatePairedOnePagerPdf(data, {
        nameA: firstA,
        nameB: firstB,
        dateGenerated,
        nm,
        mode,
        scope,
        protectiveFirst,
        facetColor: (f) => {
          const domain = lookupFacet(f)?.domain;
          if (!domain) return undefined;
          // Amber is illegible as 7pt text on a pale fill. Mustard is its text-safe pair.
          // Print only; the on-screen chip keeps amber and already darkens its own label.
          const hex = domain === "Pleasure" ? MUSTARD : DIM_COLOR[domain];
          return hex ? hexToRgb(hex) : undefined;
        },
      });
    } finally {
      setDownloading(null);
    }
  };

  const DownloadButton = ({
    scope,
    label,
    title,
  }: {
    scope: "summary" | "full";
    label: string;
    title: string;
  }) => (
    <Button
      size="sm"
      title={title}
      onClick={() => download(scope)}
      disabled={downloading !== null}
    >
      {downloading === scope ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );

  const VoiceCol = ({
    voice, who, heading,
  }: { voice: OnePagerVoice; who: "a" | "b"; heading: string }) => (
    <div style={{ borderLeft: `3px solid ${who === "a" ? COLOR_A : COLOR_B}`, paddingLeft: 12 }}>
      <div
        style={{
          fontFamily: POPPINS,
          fontWeight: 700,
          fontSize: 13,
          color: who === "a" ? COLOR_A : COLOR_B,
          marginBottom: 8,
        }}
      >
        {heading}
      </div>
      {VOICE_LABELS.map(([key, label]) => {
        const text = lineText(voice?.[key]);
        if (!text) return null;
        return (
          <div key={key} style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: GRAY,
                marginBottom: 2,
              }}
            >
              {label}
            </div>
            {/* first person, quoted speech — no name substitution here by design */}
            <div style={{ fontSize: 15, lineHeight: 1.5, color: NAVY }}>
              {`“${text}”`}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          style={{ background: "#fff", color: NAVY, borderColor: "transparent" }}
        >
          <FileText className="mr-2 h-4 w-4" />
          Paired snapshot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: POPPINS }}>{nm(data.title ?? "Your paired snapshot")}</DialogTitle>
          <DialogDescription>
            Read it here, or download it as a branded two-page PDF.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList
            className="grid w-full"
            style={{ gridTemplateColumns: `repeat(${hasPage2 ? 2 : 1}, minmax(0, 1fr))` }}
          >
            <TabsTrigger value="summary">Your summary</TabsTrigger>
            {hasPage2 && <TabsTrigger value="preview">Talk about this, and what is next</TabsTrigger>}
          </TabsList>

          <TabsContent value="summary" className="mt-4" style={{ color: NAVY }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Eyebrow>BrainWise · Paired Profile · {hasPage2 ? "Page one of two" : "Page one"}</Eyebrow>
                <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 12, color: GRAY }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: COLOR_A }} />
                    {firstA}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: COLOR_B }} />
                    {firstB}
                  </span>
                </div>
              </div>
              <DownloadButton
                scope="summary"
                label="One-page PDF"
                title="Download just the one-page summary"
              />
            </div>

            {data.opening && (
              <div
                style={{
                  borderLeft: `3px solid ${TEAL}`,
                  paddingLeft: 12,
                  fontSize: 15,
                  lineHeight: 1.6,
                  marginTop: 12,
                }}
              >
                {nm(data.opening)}
              </div>
            )}

            <Head>What happens between you</Head>
            <div>
              {SHARED_LABELS.map(([key, label], i) => {
                const text = lineText(data.shared?.[key]);
                if (!text) return null;
                return (
                  <div
                    key={key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "180px 1fr",
                      gap: 12,
                      padding: "8px 0",
                      borderTop: i === 0 ? "none" : "1px dotted rgba(2,31,54,.12)",
                    }}
                  >
                    <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 14, color: NAVY }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.55 }}>{nm(text)}</div>
                  </div>
                );
              })}
            </div>

            <Head>In your own words, to each other</Head>
            <div className="grid gap-4 md:grid-cols-2">
              <VoiceCol voice={data.a_to_b} who="a" heading={`In ${firstA}'s words, to ${firstB}`} />
              <VoiceCol voice={data.b_to_a} who="b" heading={`In ${firstB}'s words, to ${firstA}`} />
            </div>

            {watch.length > 0 && (
              <>
                <Head>Keep an eye on</Head>
                <div className="grid gap-4 md:grid-cols-2">
                  {watch.slice(0, 2).map((w, i) => (
                    <div key={i} style={{ borderLeft: `3px solid ${protectiveFirst && i === 0 ? PURPLE : AMBER}`, paddingLeft: 12 }}>
                      <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 15, color: protectiveFirst && i === 0 ? PURPLE : MUSTARD }}>
                        {nm(w.point ?? "")}
                      </div>
                      <div style={{ fontSize: 15, lineHeight: 1.55, marginTop: 3 }}>{nm(w.body ?? "")}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {data.disclaimer && (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(2,31,54,.12)",
                  fontSize: 12,
                  color: GRAY,
                  lineHeight: 1.5,
                }}
              >
                {nm(data.disclaimer)}
              </div>
            )}
          </TabsContent>

          {hasPage2 && (
            <TabsContent value="preview" className="mt-4" style={{ color: NAVY }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Eyebrow>BrainWise · Paired Profile · Page two of two</Eyebrow>
                  {preview.length > 0 && (
                    <p style={{ fontSize: 13.5, lineHeight: 1.55, color: GRAY, margin: 0 }}>
                      Page one is the short version. Your full report goes deeper on each of these,
                      with the patterns behind them mapped question by question.
                    </p>
                  )}
                </div>
                <DownloadButton
                  scope="full"
                  label="Full PDF"
                  title="Download the summary plus the questions and report guide"
                />
              </div>
            {talkAbout.length > 0 && (
            <>
              <Head>Talk about this together</Head>
              <div className="grid gap-3 md:grid-cols-2">
                {talkAbout.slice(0, 4).map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span
                      style={{
                        flex: "0 0 auto",
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        background: PURPLE,
                        color: "#fff",
                        fontFamily: POPPINS,
                        fontWeight: 700,
                        fontSize: 11,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 15, lineHeight: 1.55 }}>{nm(t)}</span>
                  </div>
                ))}
              </div>
            </>
            )}

              {preview.length > 0 && (
              <>
              <Head>What is in your full report</Head>
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                {preview.map((p, i) => (
                  <div key={i} style={{ borderLeft: `3px solid ${TEAL}`, paddingLeft: 12 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span style={{ fontFamily: POPPINS, fontWeight: 800, fontSize: 20, color: TEAL, lineHeight: 1 }}>
                        {i + 1}
                      </span>
                      <span style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 15, color: NAVY }}>
                        {nm(p.heading ?? p.section ?? "")}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.55, marginTop: 4 }}>{nm(p.text ?? "")}</div>
                    {Array.isArray(p.facets) && p.facets.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                        {p.facets.map((f, j) => (
                          <FacetChip
                            key={`${f}-${j}`}
                            name={nm(f)}
                            entry={lookupFacet(f)}
                            mode={mode}
                            firstA={firstA}
                            firstB={firstB}
                            delay={0}
                            size="sm"
                            inOverlay
                            onCloseOverlay={() => setOpen(false)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
