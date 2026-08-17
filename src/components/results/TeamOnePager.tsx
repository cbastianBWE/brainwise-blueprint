import { useState } from "react";
import { FileText, Download, Loader2, Lock } from "lucide-react";
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
import {
  FacetChip,
  POPPINS,
  NAVY,
  TEAL,
  GRAY,
  PURPLE,
  MUSTARD,
  AMBER,
  ORANGE,
} from "@/components/results/pairedFacetChip";

/* card language, matching the team report's v2 treatment */
const LINE = "rgba(2,31,54,.10)";
const FLAT_SHADOW = "0 1px 2px rgba(2,31,54,.04)";
const CARD_BG = "#ffffff";

import {
  generateTeamOnePagerPdf,
  TEAM_SHARED_LABELS,
  type TeamOnePagerSection,
  type LeaderOnePagerSection,
  type TeamOnePagerCard,
} from "@/lib/generateTeamOnePagerPdf";
import { HighlightableText } from "@/components/results/ReportHighlight";

export type { TeamOnePagerSection, LeaderOnePagerSection };

interface ChipEntry {
  itemNumber?: number;
  facetName?: string;
  domain?: string | null;
  shape?: string | null;
  stats?: { n: number; mean: number; min: number; max: number; range: number } | null;
}

interface Props {
  /** one_pager_team — never gated */
  team?: TeamOnePagerSection;
  /** one_pager_leader — the row is absent for viewers RLS does not allow */
  leader?: LeaderOnePagerSection;
  teamName: string;
  dateGenerated?: string;
  lookupFacet: (name: string) => ChipEntry | undefined;
  /** tooltip copy for a team chip, owned by the report */
  chipTip: (entry: ChipEntry) => string | null;
  /** facet index for PDF chip color and display labels */
  facets: { facetName?: string | null; domain?: string | null }[];
}

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

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Dialog entry point for the team one-pagers: the team sheet everyone can read,
 * and the leader sheet, which only renders when the gated row came back.
 */
export default function TeamOnePager({
  team,
  leader,
  teamName,
  dateGenerated,
  lookupFacet,
  chipTip,
  facets,
}: Props) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<null | "team" | "leader">(null);

  const hasTeam = !!team && (text(team.title) || text(team.opening) || (team.split?.length ?? 0) > 0);
  const hasLeader =
    !!leader && (text(leader.title) || text(leader.opening) || (leader.lean_on?.length ?? 0) > 0);
  if (!hasTeam && !hasLeader) return null;

  const download = async (scope: "team" | "leader") => {
    setDownloading(scope);
    try {
      if (scope === "team" && team) {
        await generateTeamOnePagerPdf({ scope: "team", data: team }, { teamName, dateGenerated, facets });
      } else if (scope === "leader" && leader) {
        await generateTeamOnePagerPdf({ scope: "leader", data: leader }, { teamName, dateGenerated, facets });
      }
    } finally {
      setDownloading(null);
    }
  };

  const DownloadButton = ({ scope, label, title }: { scope: "team" | "leader"; label: string; title: string }) => (
    <Button size="sm" title={title} onClick={() => download(scope)} disabled={downloading !== null}>
      {downloading === scope ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );

  const Chips = ({ list }: { list?: string[] }) => {
    if (!Array.isArray(list) || list.length === 0) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
        {list.filter(Boolean).map((f, j) => {
          const entry = lookupFacet(f);
          return (
            <FacetChip
              key={`${f}-${j}`}
              name={f}
              entry={entry}
              mode="work"
              tip={entry ? chipTip(entry) : null}
              delay={j * 25}
              size="sm"
              inOverlay
              onCloseOverlay={() => setOpen(false)}
            />
          );
        })}
      </div>
    );
  };

  const Card = ({
    card,
    accent,
    blockKey,
  }: {
    card: TeamOnePagerCard;
    accent: string;
    /** prefix only — this component appends :point and :body */
    blockKey: string;
  }) => (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${LINE}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 12,
        boxShadow: FLAT_SHADOW,
        padding: "12px 14px",
      }}
    >
      {text(card.point) && (
        <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 15, color: NAVY }}>
          <HighlightableText blockKey={`${blockKey}:point`} text={card.point ?? ""} />
        </div>
      )}
      {text(card.body) && (
        <div style={{ fontSize: 15, lineHeight: 1.55, marginTop: 3 }}>
          <HighlightableText blockKey={`${blockKey}:body`} text={card.body ?? ""} />
        </div>
      )}
      <Chips list={card.facets} />
    </div>
  );

  const Numbered = ({
    items,
    cols,
    blockKey,
  }: {
    items: string[];
    cols: 1 | 2;
    /** prefix only — this component appends :${i} */
    blockKey: string;
  }) => (
    <div className={`grid gap-3 ${cols === 2 ? "md:grid-cols-2" : ""}`}>
      {items.map((t, i) => (
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
          <span style={{ fontSize: 15, lineHeight: 1.55 }}>
            <HighlightableText blockKey={`${blockKey}:${i}`} text={t} />
          </span>
        </div>
      ))}
    </div>
  );

  const Disclaimer = ({ children }: { children: string }) => (
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
      {children}
    </div>
  );

  const sharedRows = TEAM_SHARED_LABELS
    .map(([key, label]) => ({ key, label, line: team?.shared?.[key] }))
    .filter((r) => text(r.line?.text));
  const split = (team?.split ?? []).filter(Boolean).slice(0, 2);
  const watch = (team?.watch ?? []).filter(Boolean).slice(0, 2);
  const talkAbout = (team?.talk_about ?? []).map(text).filter(Boolean).slice(0, 4);
  const preview = (team?.report_preview ?? []).filter(Boolean);

  const leanOn = (leader?.lean_on ?? []).filter(Boolean).slice(0, 2);
  const willBite = (leader?.will_bite ?? []).filter(Boolean).slice(0, 2);
  const firstMoves = (leader?.first_moves ?? []).filter(Boolean).slice(0, 3);
  const watchFor = (leader?.watch_for ?? []).map(text).filter(Boolean).slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          style={{ background: "#fff", color: NAVY, borderColor: "transparent" }}
        >
          <FileText className="mr-2 h-4 w-4" />
          One-page snapshot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: POPPINS }}>
            {text(team?.title) || text(leader?.title) || "Your team snapshot"}
          </DialogTitle>
          <DialogDescription>
            Read it here, or download it as a branded one-page PDF.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={hasTeam ? "team" : "leader"} className="w-full">
          <TabsList
            className="grid w-full"
            style={{ gridTemplateColumns: `repeat(${hasTeam && hasLeader ? 2 : 1}, minmax(0, 1fr))` }}
          >
            {hasTeam && <TabsTrigger value="team">Your team</TabsTrigger>}
            {hasLeader && (
              <TabsTrigger value="leader">
                <Lock className="mr-2 h-3.5 w-3.5" />
                For the leader
              </TabsTrigger>
            )}
          </TabsList>

          {hasTeam && team && (
            <TabsContent value="team" className="mt-4" style={{ color: NAVY }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Eyebrow>BrainWise · Team Profile · {teamName}</Eyebrow>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: GRAY, margin: 0 }}>
                    One sheet to read together, before anyone opens the full report.
                  </p>
                </div>
                <DownloadButton scope="team" label="Team PDF" title="Download the one-page team snapshot" />
              </div>

              {text(team.opening) && (
                <div
                  style={{
                    borderLeft: `3px solid ${TEAL}`,
                    paddingLeft: 12,
                    fontSize: 15,
                    lineHeight: 1.6,
                    marginTop: 12,
                  }}
                >
                  <HighlightableText blockKey="one_pager_team:opening" text={text(team.opening)} />
                </div>
              )}

              {sharedRows.length > 0 && (
                <>
                  <Head>What happens across this team</Head>
                  <div>
                    {sharedRows.map((row, i) => (
                      <div
                        key={row.key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "180px 1fr",
                          gap: 12,
                          padding: "8px 0",
                          borderTop: i === 0 ? "none" : "1px dotted rgba(2,31,54,.12)",
                        }}
                      >
                        <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 14, color: NAVY }}>
                          {row.label}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, lineHeight: 1.55 }}>
                            <HighlightableText
                              blockKey={`one_pager_team:shared:${row.key}`}
                              text={text(row.line?.text)}
                            />
                          </div>
                          <Chips list={row.line?.facets} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {split.length > 0 && (
                <>
                  <Head>Where you divide</Head>
                  <div className="grid gap-4 md:grid-cols-2">
                    {split.map((c, i) => (
                      <Card key={i} card={c} accent={MUSTARD} blockKey={`one_pager_team:split:${i}`} />
                    ))}
                  </div>
                </>
              )}

              {watch.length > 0 && (
                <>
                  <Head>Keep an eye on</Head>
                  <div className="grid gap-4 md:grid-cols-2">
                    {watch.map((c, i) => (
                      <Card key={i} card={c} accent={AMBER} blockKey={`one_pager_team:watch:${i}`} />
                    ))}
                  </div>
                </>
              )}

              {talkAbout.length > 0 && (
                <>
                  <Head>Talk about this together</Head>
                  <Numbered items={talkAbout} cols={2} blockKey="one_pager_team:talk_about" />
                </>
              )}

              {preview.length > 0 && (
                <>
                  <Head>What is in your full report</Head>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: GRAY, margin: "0 0 10px" }}>
                    This sheet is the short version. Your full team report goes deeper on each of these,
                    with the patterns behind them mapped question by question.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {preview.map((p, i) => (
                      <div key={i} style={{ borderLeft: `3px solid ${TEAL}`, paddingLeft: 12 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          <span style={{ fontFamily: POPPINS, fontWeight: 800, fontSize: 20, color: TEAL, lineHeight: 1 }}>
                            {i + 1}
                          </span>
                          <span style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 15, color: NAVY }}>
                            <HighlightableText
                              blockKey={`one_pager_team:preview:${i}:heading`}
                              text={text(p.heading) || text(p.section)}
                            />
                          </span>
                        </div>
                        <div style={{ fontSize: 15, lineHeight: 1.55, marginTop: 4 }}>
                          <HighlightableText
                            blockKey={`one_pager_team:preview:${i}:text`}
                            text={text(p.text)}
                          />
                        </div>
                        <Chips list={p.facets} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {text(team.disclaimer) && <Disclaimer>{text(team.disclaimer)}</Disclaimer>}
            </TabsContent>
          )}

          {hasLeader && leader && (
            <TabsContent value="leader" className="mt-4" style={{ color: NAVY }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Eyebrow>BrainWise · Team Profile · For the leader</Eyebrow>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: GRAY, margin: 0 }}>
                    Restricted. This sheet is written for whoever runs this team, not for the room.
                  </p>
                </div>
                <DownloadButton scope="leader" label="Leader PDF" title="Download the one-page leader snapshot" />
              </div>

              {text(leader.opening) && (
                <div
                  style={{
                    borderLeft: `3px solid ${TEAL}`,
                    paddingLeft: 12,
                    fontSize: 15,
                    lineHeight: 1.6,
                    marginTop: 12,
                  }}
                >
                  <HighlightableText blockKey="one_pager_leader:opening" text={text(leader.opening)} />
                </div>
              )}

              {leanOn.length > 0 && (
                <>
                  <Head>Lean on this</Head>
                  <div className="grid gap-4 md:grid-cols-2">
                    {leanOn.map((c, i) => (
                      <Card key={i} card={c} accent={TEAL} blockKey={`one_pager_leader:lean_on:${i}`} />
                    ))}
                  </div>
                </>
              )}

              {willBite.length > 0 && (
                <>
                  <Head>What will bite you</Head>
                  <div className="grid gap-4 md:grid-cols-2">
                    {willBite.map((c, i) => (
                      <Card key={i} card={c} accent={MUSTARD} blockKey={`one_pager_leader:will_bite:${i}`} />
                    ))}
                  </div>
                </>
              )}

              {text(leader.fault_lines?.text) && (
                <>
                  <Head>The fault line</Head>
                  <Card
                    card={{ point: "", body: text(leader.fault_lines?.text), facets: leader.fault_lines?.facets }}
                    accent={PURPLE}
                    blockKey="one_pager_leader:fault_lines"
                  />
                </>
              )}

              {firstMoves.length > 0 && (
                <>
                  <Head>Your first moves</Head>
                  <div className="grid gap-4 md:grid-cols-2">
                    {firstMoves.map((c, i) => (
                      <Card key={i} card={c} accent={NAVY} blockKey={`one_pager_leader:first_moves:${i}`} />
                    ))}
                  </div>
                </>
              )}

              {watchFor.length > 0 && (
                <>
                  <Head>Watch for these in the room</Head>
                  <Numbered items={watchFor} cols={1} blockKey="one_pager_leader:watch_for" />
                </>
              )}

              {text(leader.disclaimer) && <Disclaimer>{text(leader.disclaimer)}</Disclaimer>}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
