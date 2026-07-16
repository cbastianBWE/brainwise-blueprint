import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Loader2,
  Briefcase,
  Stethoscope,
  HeartHandshake,
  Users,
} from "lucide-react";
import { generateOnePagerPdf, type OnePager } from "@/lib/generateOnePagerPdf";

const ORDER: OnePager["audience"][] = ["work", "therapist", "partner", "friend"];
const LABEL: Record<OnePager["audience"], string> = {
  work: "Work",
  therapist: "Therapist",
  partner: "Partner",
  friend: "Friend",
};
const ICON: Record<OnePager["audience"], React.ComponentType<{ className?: string }>> = {
  work: Briefcase,
  therapist: Stethoscope,
  partner: HeartHandshake,
  friend: Users,
};

export default function PtpOnePagers({
  assessmentResultId,
  userName,
  dateTaken,
}: {
  assessmentResultId: string;
  userName: string;
  dateTaken?: string;
}) {
  const [pagers, setPagers] = useState<OnePager[]>([]);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<OnePager["audience"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("facet_interpretations")
        .select("section_type, facet_data")
        .eq("assessment_result_id", assessmentResultId)
        .like("section_type", "onepager_%");
      if (cancelled) return;
      const list = (data ?? [])
        .map((r: any) => r.facet_data as OnePager)
        .filter((p) => p && Array.isArray(p.sections));
      list.sort(
        (a, b) => ORDER.indexOf(a.audience) - ORDER.indexOf(b.audience)
      );
      setPagers(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [assessmentResultId]);

  if (pagers.length === 0) return null;

  const download = async (p: OnePager) => {
    setDownloading(p.audience);
    try {
      await generateOnePagerPdf(p, { userName, dateTaken });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileText className="mr-2 h-4 w-4" /> One-page snapshots
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>One-page snapshots</DialogTitle>
            <DialogDescription>
              Share the right version of you with the right person. Pick an audience,
              read it here, or download it as a branded one-page PDF.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue={pagers[0].audience} className="w-full">
            <TabsList
              className="grid w-full"
              style={{ gridTemplateColumns: `repeat(${pagers.length}, minmax(0, 1fr))` }}
            >
              {pagers.map((p) => {
                const Icon = ICON[p.audience];
                return (
                  <TabsTrigger key={p.audience} value={p.audience}>
                    <Icon className="mr-2 h-4 w-4" /> {LABEL[p.audience]}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {pagers.map((p) => (
              <TabsContent key={p.audience} value={p.audience} className="space-y-4 mt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                    {p.disclaimer && (
                      <p className="text-xs text-muted-foreground mt-1">{p.disclaimer}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => download(p)}
                    disabled={downloading === p.audience}
                  >
                    {downloading === p.audience ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    PDF
                  </Button>
                </div>
                <div
                  className={
                    p.sections.length > 1 ? "grid gap-4 md:grid-cols-2" : "space-y-4"
                  }
                >
                  {p.sections.map((s, si) => (
                    <div key={si} className="rounded-lg border p-4 space-y-3 bg-card">
                      {s.label && (
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          {s.label}
                        </p>
                      )}
                      <p className="text-sm text-foreground">{s.snapshot}</p>
                      {s.blocks.map((b, bi) => (
                        <div key={bi} className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            {b.heading}
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            {b.items.map((it, ii) => (
                              <li key={ii} className="text-sm text-foreground">
                                {it}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium text-foreground">
                    <span className="font-semibold">In a nutshell:</span> {p.nutshell}
                  </p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
