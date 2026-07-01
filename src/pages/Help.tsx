import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, HelpCircle, ImageIcon } from "lucide-react";
import { useAccountRole } from "@/lib/accountRoles";
import { helpContent, helpRoleOrder } from "@/content/help";
import type { HelpGuide, HelpRoleContent } from "@/content/help/types";
import { AnnotatedScreenshot } from "@/components/help/AnnotatedScreenshot";

/**
 * Which help tabs a viewer sees.
 * Regular users only see their own. Coaches see coach + client-facing tabs.
 * Admins/super admins see everything.
 */
function visibleRoles(
  accountType: string | null,
  isPractitionerCoach: boolean,
  isMentor: boolean,
  isSuperAdmin: boolean,
): HelpRoleContent["role"][] {
  if (isSuperAdmin) return helpRoleOrder;

  const roles = new Set<HelpRoleContent["role"]>();

  // Everyone can see the Individual guides — the assessment/results/highlighting
  // flows are shared across all account types.
  roles.add("individual");

  if (accountType === "coach" || isPractitionerCoach) {
    roles.add("coach");
    roles.add("coach_client");
  }
  if (isMentor) roles.add("mentor");
  if (accountType === "corporate_employee") roles.add("org_member");
  if (accountType === "company_admin" || accountType === "org_admin") {
    roles.add("org_admin");
    roles.add("org_member");
  }

  return helpRoleOrder.filter((r) => roles.has(r));
}

function defaultRoleFor(
  accountType: string | null,
  isPractitionerCoach: boolean,
  isSuperAdmin: boolean,
): HelpRoleContent["role"] {
  if (isSuperAdmin) return "super_admin";
  if (accountType === "coach" || isPractitionerCoach) return "coach";
  if (accountType === "company_admin" || accountType === "org_admin") return "org_admin";
  if (accountType === "corporate_employee") return "org_member";
  return "individual";
}

function matchesQuery(guide: HelpGuide, q: string): boolean {
  if (!q) return true;
  const hay = `${guide.title} ${guide.summary} ${guide.steps.map((s) => s.title + " " + s.body).join(" ")}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

const HelpRoleTab = ({
  content,
  query,
  onOpenImage,
}: {
  content: HelpRoleContent;
  query: string;
  onOpenImage: (url: string, alt: string, hotspots?: HelpGuide["steps"][number]["hotspots"]) => void;
}) => {
  const guides = content.guides.filter((g) => matchesQuery(g, query));



  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">{content.description}</p>

      {content.guides.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Guides for {content.label} are coming soon.
          </CardContent>
        </Card>
      ) : guides.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No guides match "{query}".
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {guides.map((guide) => (
            <AccordionItem
              key={guide.id}
              value={guide.id}
              className="rounded-lg border bg-card px-4"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex flex-col items-start gap-1 pr-4">
                  <span className="font-semibold text-base">{guide.title}</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    {guide.summary}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-6 pt-2">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        {i + 1}
                      </div>
                      <div className="flex-1 space-y-3 min-w-0">
                        <h4 className="font-semibold text-foreground">{step.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.body}
                        </p>
                        {step.imageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenImage(step.imageUrl!, step.imageAlt ?? step.title, step.hotspots)
                            }
                            className="group relative block overflow-hidden rounded-md border bg-muted/40 transition hover:border-primary text-left"
                          >
                            <AnnotatedScreenshot
                              src={step.imageUrl}
                              alt={step.imageAlt ?? step.title}
                              hotspots={step.hotspots}
                            />
                            <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-background/80 px-2 py-1 text-[10px] text-muted-foreground opacity-0 backdrop-blur transition group-hover:opacity-100">
                              <ImageIcon className="h-3 w-3" /> Click to enlarge
                            </span>
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};

export default function Help() {
  const {
    accountType,
    isPractitionerCoach,
    isMentor,
    isSuperAdmin,
    loading,
  } = useAccountRole();

  const roles = useMemo(
    () => visibleRoles(accountType, isPractitionerCoach, isMentor, isSuperAdmin),
    [accountType, isPractitionerCoach, isMentor, isSuperAdmin],
  );

  const [tab, setTab] = useState<HelpRoleContent["role"]>(() =>
    defaultRoleFor(accountType, isPractitionerCoach, isSuperAdmin),
  );
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<{
    url: string;
    alt: string;
    hotspots?: HelpGuide["steps"][number]["hotspots"];
  } | null>(null);

  // If the role list resolves after mount, make sure the active tab is one the
  // viewer can actually see.
  const activeTab = roles.includes(tab) ? tab : roles[0] ?? "individual";

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      <div className="flex items-start gap-3">
        <HelpCircle className="h-8 w-8 text-primary shrink-0 mt-1" />
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Help Center</h1>
          <p className="text-muted-foreground mt-1">
            Step-by-step how-to guides for using BrainWise. Pick a role tab that
            matches how you use the platform.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setTab(v as HelpRoleContent["role"])}
        >
          <TabsList className="flex flex-wrap h-auto">
            {roles.map((r) => {
              const c = helpContent[r];
              return (
                <TabsTrigger key={r} value={r} className="gap-2">
                  {c.label}
                  {c.guides.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {c.guides.length}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {roles.map((r) => (
            <TabsContent key={r} value={r} className="mt-6">
              <HelpRoleTab
                content={helpContent[r]}
                query={query}
                onOpenImage={(url, alt, hotspots) => setPreview({ url, alt, hotspots })}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl p-2 md:p-4">
          <DialogTitle className="sr-only">{preview?.alt ?? "Screenshot"}</DialogTitle>
          {preview && (
            <AnnotatedScreenshot
              src={preview.url}
              alt={preview.alt}
              hotspots={preview.hotspots}
              className="max-w-none w-full"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
