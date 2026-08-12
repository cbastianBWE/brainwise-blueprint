import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Download, FileText, Linkedin, Award, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CertificateCanvas from "@/components/certification/CertificateCanvas";

interface MyCertEntry {
  certification_id: string;
  certification_type: string;
  display_name: string;
  certified_at: string;
}

interface MyCertsResult {
  certifications: MyCertEntry[];
  count: number;
  generated_at: string;
}

interface CredentialResult {
  certification: {
    certification_id: string;
    certification_type: string;
    status: string;
    created_at: string;
    certified_at: string | null;
    certified_by: string | null;
  };
  display_name: string;
  recipient: { user_id: string; full_name: string };
  certification_path_id: string | null;
  is_certified: boolean;
  viewer_role: "self" | "mentor" | "super_admin";
  generated_at: string;
}

const LINKEDIN_ORG_ID = "118614203";

const BADGE_ASSETS: Record<
  string,
  { linkedin: { navy: string; cream: string }; banner: { navy: string; cream: string } }
> = {
  ptp_coach: {
    linkedin: {
      navy: "/badges/ptp-practitioner-linkedin-badge-dark.png",
      cream: "/badges/ptp-practitioner-linkedin-badge-light.png",
    },
    banner: {
      navy: "/badges/ptp-practitioner-email-banner-dark.png",
      cream: "/badges/ptp-practitioner-email-banner-light.png",
    },
  },
};

const CERT_FILE_LABEL: Record<string, string> = {
  ptp_coach: "PTP-Practitioner",
};

interface CaptionOption {
  id: string;
  label: string;
  hint: string;
  build: (displayName: string, verifyUrl: string) => string;
}

const CAPTION_OPTIONS: CaptionOption[] = [
  {
    id: "practical",
    label: "What I can now do",
    hint: "Leads with the credential and what it unlocks for clients.",
    build: (n, url) =>
      `🧠 I'm now a ${n}.\n\n` +
      `The Personal Threat & Reward Profile maps 89 facets of what actually drives someone, and just as importantly, what's quietly driving against it. Most assessments tell you what a person does. This one tells you what they're protecting.\n\n` +
      `Practically: I can now run PTP debriefs, plus paired and team profiles. It sits underneath the tools you already use rather than replacing them.\n\n` +
      `If you've ever watched someone say they want a change and then work against it for six months, that gap is what this is built for. Happy to talk it through. 👇\n\n` +
      `Verify my credential: ${url}`,
  },
  {
    id: "insight",
    label: "What surprised me",
    hint: "Leads with an idea from the training. Reads least like an announcement.",
    build: (n, url) =>
      `Certified ✅ I'm officially a ${n}.\n\n` +
      `The part that stuck with me: threat and reward run at the same time, not as opposites. Someone can genuinely want the promotion and genuinely be protecting themselves from it. Both true at once. Until you can see both, coaching the goal alone doesn't move anything.\n\n` +
      `The Personal Threat & Reward Profile puts numbers on both sides across 89 facets, and the debrief turns that into something a person can act on. 🧠\n\n` +
      `I'm now certified to run those debriefs and to deliver paired and team profiles. Want to see yours? Message me.\n\n` +
      `Verify my credential: ${url}`,
  },
  {
    id: "short",
    label: "Short and punchy",
    hint: "Four lines. Best if you post often and don't want a wall of text.",
    build: (n, url) =>
      `🎉 Officially a ${n}.\n\n` +
      `89 facets. What drives you, and what's quietly driving against it. I can now run PTP debriefs plus paired and team profiles.\n\n` +
      `If you've ever wondered why the change you want keeps stalling, that's the question this answers. Let's talk. 🧠\n\n` +
      `Verify my credential: ${url}`,
  },
];

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadFromUrl(src: string, filename: string) {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    triggerDownload(blob, filename);
  } catch {
    /* no-op */
  }
}

export default function CertificationPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [searchParams] = useSearchParams();
  const deepLinkCert = searchParams.get("cert");

  const listQuery = useQuery({
    queryKey: ["my-certifications"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_my_certifications" as never, {} as never);
      if (error) throw error;
      return data as unknown as MyCertsResult;
    },
  });

  const certs = listQuery.data?.certifications ?? [];
  const defaultActive = useMemo(() => {
    if (deepLinkCert && certs.some((c) => c.certification_id === deepLinkCert)) return deepLinkCert;
    return certs[0]?.certification_id ?? "";
  }, [certs, deepLinkCert]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (defaultActive && !activeId) setActiveId(defaultActive);
  }, [defaultActive, activeId]);

  if (listQuery.isLoading || !userId) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/30 bg-card p-6 text-destructive">
          Could not load your certifications. Please try again.
        </div>
      </div>
    );
  }

  if (certs.length === 0) {
    return (
      <div className="px-4 sm:px-6 pt-8 pb-10 max-w-2xl">
        <div className="rounded-lg border bg-card p-8 text-center space-y-3">
          <Award className="h-10 w-10 mx-auto text-[var(--bw-orange)]" />
          <h1 className="text-xl font-semibold text-[var(--bw-navy)]">No certifications yet</h1>
          <p className="text-sm text-muted-foreground">
            Once you complete a certification path, your certificate and badges will appear here.
          </p>
          <Button asChild variant="outline">
            <a href="/resources">Browse learning resources</a>
          </Button>
        </div>
      </div>
    );
  }

  if (certs.length === 1) {
    return (
      <div className="px-4 sm:px-6 pt-6 pb-10">
        <CertificationTabContent certificationId={certs[0].certification_id} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 pt-6 pb-10 space-y-6">
      <Tabs value={activeId || defaultActive} onValueChange={setActiveId}>
        <TabsList className="flex flex-wrap h-auto">
          {certs.map((c) => (
            <TabsTrigger key={c.certification_id} value={c.certification_id}>
              {c.display_name}
            </TabsTrigger>
          ))}
        </TabsList>
        {certs.map((c) => (
          <TabsContent key={c.certification_id} value={c.certification_id} className="mt-6">
            <CertificationTabContent certificationId={c.certification_id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CertificationTabContent({ certificationId }: { certificationId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [linkedinVariant, setLinkedinVariant] = useState<"navy" | "cream">("navy");
  const [bannerVariant, setBannerVariant] = useState<"navy" | "cream">("navy");
  const [shareOpen, setShareOpen] = useState(false);
  const [captionId, setCaptionId] = useState<string>("practical");
  const [caption, setCaption] = useState<string>("");
  const [posting, setPosting] = useState(false);
  const [postedUrl, setPostedUrl] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [manualFallback, setManualFallback] = useState(false);

  useEffect(() => {
    setCanvasReady(false);
  }, [certificationId]);

  const credentialQuery = useQuery({
    queryKey: ["certification-credential", certificationId],
    enabled: !!certificationId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_certification_credential" as never,
        { p_certification_id: certificationId } as never,
      );
      if (error) throw error;
      return data as unknown as CredentialResult;
    },
  });

  if (credentialQuery.isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (credentialQuery.isError || !credentialQuery.data) {
    const msg = (credentialQuery.error as any)?.message ?? "";
    let display = "Could not load this certification.";
    if (msg.includes("access_denied")) display = "You don't have access to this certification.";
    else if (msg.includes("certification_not_found"))
      display = "This certification could not be found.";
    return (
      <div className="rounded-md border border-destructive/30 bg-card p-6 text-destructive">
        {display}
      </div>
    );
  }

  const cred = credentialQuery.data;
  const { certification, display_name, recipient, is_certified, certification_path_id } = cred;
  const certType = certification.certification_type;
  const certifiedAt = certification.certified_at;
  const awardedDate = certifiedAt ? format(new Date(certifiedAt), "MMMM d, yyyy") : "";
  const hasTemplate = certType === "ptp_coach";
  const assets = BADGE_ASSETS[certType];
  const fileLabel = CERT_FILE_LABEL[certType] ?? certType;

  if (!is_certified) {
    const isRevoked = certification.status === "revoked";
    return (
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h1 className="text-xl font-semibold">{display_name}</h1>
        <p className="text-sm text-muted-foreground">
          {isRevoked
            ? "This certification is no longer active."
            : "This certification is not yet complete. Finish the certification path to unlock your certificate."}
        </p>
        {certification_path_id && !isRevoked && (
          <Button
            asChild
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            <a href={`/learning/cert-path/${certification_path_id}`}>View certification path</a>
          </Button>
        )}
      </div>
    );
  }

  const handleCanvasReady = (c: HTMLCanvasElement) => {
    canvasRef.current = c;
    setCanvasReady(true);
  };

  // The file the practitioner attaches to their LinkedIn post. The full-resolution
  // certificate is over 3000px wide and needlessly heavy to upload from a phone.
  const buildPostImage = (): Promise<Blob | null> => {
    const src = canvasRef.current;
    if (!src) return Promise.resolve(null);
    const out = document.createElement("canvas");
    const scale = Math.min(1, 1600 / src.width);
    out.width = Math.round(src.width * scale);
    out.height = Math.round(src.height * scale);
    const ctx = out.getContext("2d");
    if (!ctx) return Promise.resolve(null);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, out.width, out.height);
    return new Promise((resolve) => out.toBlob((b) => resolve(b), "image/png"));
  };

  const handlePng = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      triggerDownload(blob, `BrainWise-${fileLabel}-Certificate.png`);
    }, "image/png");
  };

  const handlePdf = () => {
    const c = canvasRef.current;
    if (!c) return;
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [c.width, c.height],
    });
    pdf.addImage(c.toDataURL("image/png"), "PNG", 0, 0, c.width, c.height);
    pdf.save(`BrainWise-${fileLabel}-Certificate.pdf`);
  };

  const verifyUrl = `${window.location.origin}/verify/cert/${certification.certification_id}`;

  const handleAddToProfile = () => {
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: display_name,
      organizationId: LINKEDIN_ORG_ID,
      certId: certification.certification_id,
      certUrl: verifyUrl,
    });
    if (certifiedAt) {
      const d = new Date(certifiedAt);
      params.set("issueYear", String(d.getFullYear()));
      params.set("issueMonth", String(d.getMonth() + 1));
    }
    window.open(
      `https://www.linkedin.com/profile/add?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const openShare = () => {
    const opt = CAPTION_OPTIONS.find((o) => o.id === captionId) ?? CAPTION_OPTIONS[0];
    setCaption(opt.build(display_name, verifyUrl));
    setPosted(false);
    setPostedUrl(null);
    setManualFallback(false);
    setShareOpen(true);
  };

  const pickCaption = (id: string) => {
    if (id === captionId) return;
    setCaptionId(id);
    const opt = CAPTION_OPTIONS.find((o) => o.id === id);
    if (opt) setCaption(opt.build(display_name, verifyUrl));
  };

  const manualShare = async () => {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      /* the caption is on screen either way */
    }
    const image = await buildPostImage();
    if (image) triggerDownload(image, `BrainWise-${fileLabel}-Certificate-for-LinkedIn.png`);
    window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank", "noopener,noreferrer");
  };

  const postToLinkedIn = async () => {
    if (!canvasRef.current || !caption.trim()) return;
    setPosting(true);
    try {
      // 1. Store the certificate image. The Edge Function reads it from storage
      //    rather than us shipping bytes through the OAuth round trip.
      const image = await buildPostImage();
      if (!image) throw new Error("Could not prepare your certificate image.");
      const form = new FormData();
      form.append("certification_id", certification.certification_id);
      form.append("file", image, "certificate.png");
      const up = await supabase.functions.invoke("persist-certificate-image", { body: form });
      if (up.error) throw new Error("Could not save your certificate image.");

      // 2. Get the public client id.
      const cfg = await supabase.functions.invoke("linkedin-share-certificate", { method: "GET" });
      if (cfg.error || !cfg.data?.client_id) {
        throw new Error("LinkedIn posting is not configured yet.");
      }

      // 3. Popup, so this page stays alive and the caption survives.
      const redirectUri = `${window.location.origin}/linkedin/callback`;
      const state = crypto.randomUUID();
      const authUrl =
        `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
        `&client_id=${encodeURIComponent(cfg.data.client_id)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(cfg.data.scope ?? "openid profile w_member_social")}`;

      const popup = window.open(authUrl, "brainwise-linkedin", "width=600,height=720");
      if (!popup) {
        setManualFallback(true);
        throw new Error("Your browser blocked the LinkedIn window. Use the manual option below.");
      }

      const code: string = await new Promise((resolve, reject) => {
        let settled = false;
        let closeTimeout: number | undefined;

        const cleanup = () => {
          window.clearInterval(timer);
          window.clearTimeout(closeTimeout);
          window.removeEventListener("message", onMessage);
        };

        function onMessage(e: MessageEvent) {
          if (e.origin !== window.location.origin) return;
          if (e.data?.source !== "brainwise-linkedin") return;
          if (e.data.state !== state) return;
          if (settled) return;
          settled = true;
          cleanup();
          if (e.data.error) {
            reject(new Error(e.data.errorDescription || "LinkedIn declined the request."));
          } else if (e.data.code) {
            resolve(e.data.code);
          } else {
            reject(new Error("LinkedIn did not return an authorization code."));
          }
        }

        // The callback page posts its message and closes itself immediately, so a
        // closed window is not proof of cancellation. Wait for the message to arrive
        // before giving up.
        const timer = window.setInterval(() => {
          if (!popup.closed || settled || closeTimeout !== undefined) return;
          closeTimeout = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error("LinkedIn window was closed before finishing."));
          }, 1500);
        }, 500);

        window.addEventListener("message", onMessage);
      });


      // 4. Post.
      const res = await supabase.functions.invoke("linkedin-share-certificate", {
        body: {
          certification_id: certification.certification_id,
          caption,
          code,
          redirect_uri: redirectUri,
        },
      });
      if (res.error || !res.data?.ok) {
        throw new Error("LinkedIn rejected the post. Try the manual option below.");
      }

      setPosted(true);
      setPostedUrl(res.data.post_url ?? null);
      toast.success("Posted to LinkedIn.");
    } catch (err: any) {
      setManualFallback(true);
      toast.error(err?.message ?? "Could not post to LinkedIn.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Celebratory header */}
      <header className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-[var(--bw-navy)] to-[var(--bw-plum,#3b2a52)] p-6 sm:p-8 text-white">
        <div className="absolute -right-6 -top-6 opacity-20">
          <Award className="h-40 w-40 text-[var(--bw-orange)]" />
        </div>
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--bw-orange)] font-semibold">
            <Award className="h-4 w-4" /> Certified
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold">{display_name}</h1>
          <p className="text-sm text-white/80">
            Awarded to {recipient.full_name}
            {awardedDate ? ` on ${awardedDate}` : ""}
          </p>
        </div>
      </header>

      {/* Action row */}
      <div className="flex flex-wrap gap-3">
        {hasTemplate && (
          <>
            <Button
              onClick={handlePng}
              disabled={!canvasReady}
              className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
            >
              <Download className="h-4 w-4 mr-2" /> Download PNG
            </Button>
            <Button onClick={handlePdf} disabled={!canvasReady} variant="outline">
              <FileText className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </>
        )}
        <Button onClick={handleAddToProfile} variant="outline">
          <Linkedin className="h-4 w-4 mr-2" /> Add to LinkedIn profile
        </Button>
        <Button onClick={openShare} disabled={!canvasReady} variant="outline">
          <Linkedin className="h-4 w-4 mr-2" />
          Share on LinkedIn
        </Button>
      </div>

      {shareOpen && (
        <div className="rounded-md border border-[var(--bw-orange)]/40 bg-[var(--bw-orange)]/5 p-4 text-sm space-y-4">
          <div className="font-medium text-[var(--bw-navy)]">Choose a caption</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {CAPTION_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => pickCaption(o.id)}
                className={`text-left rounded-md border bg-background p-3 transition-colors ${
                  captionId === o.id
                    ? "border-[var(--bw-orange)] bg-[var(--bw-orange)]/5"
                    : "hover:border-foreground/30"
                }`}
              >
                <div className="font-medium">{o.label}</div>
                <div className="text-xs text-muted-foreground">{o.hint}</div>
              </button>
            ))}
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={12}
            className="w-full rounded border bg-background p-3 text-sm"
          />
          <div
            className={`text-right text-xs ${
              caption.length > 2800 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {caption.length} / 2800
          </div>

          {posted ? (
            <div className="space-y-2">
              <div className="font-medium text-[var(--bw-navy)]">Your post is live on LinkedIn.</div>
              {postedUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={postedUrl} target="_blank" rel="noopener noreferrer">
                    View your post
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                A LinkedIn window will open so you can authorise the post. We don't keep your
                LinkedIn login.
              </p>
              <Button
                onClick={postToLinkedIn}
                disabled={posting || !caption.trim() || caption.length > 2800}
                className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Linkedin className="h-4 w-4 mr-2" />
                )}
                Post to LinkedIn
              </Button>
            </div>
          )}

          {manualFallback && (
            <div className="rounded-md border bg-background p-4 space-y-3">
              <div className="font-medium text-[var(--bw-navy)]">
                Posting automatically didn't work. Do it manually instead:
              </div>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Paste the caption into the post box, then edit it however you like.</li>
                <li>
                  Click the photo icon and attach the certificate that just downloaded (
                  <span className="font-mono text-xs">
                    BrainWise-{fileLabel}-Certificate-for-LinkedIn.png
                  </span>
                  ).
                </li>
                <li>Post.</li>
              </ol>
              <Button size="sm" variant="outline" onClick={manualShare}>
                <Copy className="h-4 w-4 mr-1" /> Copy caption &amp; download image
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Certificate preview (smaller) */}
      {hasTemplate ? (
        <div className="mx-auto w-full max-w-3xl rounded-lg overflow-hidden border bg-[var(--bw-navy)] shadow-sm">
          <CertificateCanvas
            recipientName={recipient.full_name}
            certifiedAt={certifiedAt}
            certificationType={certType}
            onReady={handleCanvasReady}
          />
        </div>
      ) : (
        <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
          A downloadable certificate for this certification is coming soon.
        </div>
      )}

      {/* Badges / signatures */}
      {assets && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--bw-navy)]">
              Badges & Email signature
            </h2>
            <p className="text-sm text-muted-foreground">
              Share your credential on LinkedIn and in your email signature.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AssetCard
              title="LinkedIn Certification Badge"
              meta="1080 × 1080 · PNG · Square"
              variant={linkedinVariant}
              onVariantChange={setLinkedinVariant}
              previewSrc={assets.linkedin[linkedinVariant]}
              previewClassName="aspect-square max-w-[220px] mx-auto"
              downloadFilename={`BrainWise-${fileLabel}-LinkedIn-Badge-${
                linkedinVariant === "navy" ? "Navy" : "Cream"
              }.png`}
              whereToUse="LinkedIn Certifications section, post images, profile featured items."
            />
            <AssetCard
              title="Email Signature Banner"
              meta="1500 × 300 · PNG · 5:1"
              variant={bannerVariant}
              onVariantChange={setBannerVariant}
              previewSrc={assets.banner[bannerVariant]}
              previewClassName="aspect-[5/1] w-full"
              downloadFilename={`BrainWise-${fileLabel}-Email-Banner-${
                bannerVariant === "navy" ? "Navy" : "Cream"
              }.png`}
              whereToUse="Gmail/Outlook signature, newsletter footer."
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">Quick usage notes</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                LinkedIn Certifications: add as a Certification with issuer "BrainWise
                Enterprises", or use "Add to LinkedIn profile" above to prefill it.
              </li>
              <li>Email signature: cap displayed width around 600px for best rendering.</li>
              <li>Variants: use Navy on light backgrounds, Cream on dark backgrounds.</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

interface AssetCardProps {
  title: string;
  meta: string;
  variant: "navy" | "cream";
  onVariantChange: (v: "navy" | "cream") => void;
  previewSrc: string;
  previewClassName?: string;
  downloadFilename: string;
  whereToUse: string;
}

function AssetCard({
  title,
  meta,
  variant,
  onVariantChange,
  previewSrc,
  previewClassName,
  downloadFilename,
  whereToUse,
}: AssetCardProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div>
          <h3 className="font-semibold text-[var(--bw-navy)]">{title}</h3>
          <p className="text-xs text-muted-foreground">{meta}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="inline-flex rounded-md border bg-background p-0.5">
            {(["navy", "cream"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onVariantChange(v)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  variant === v
                    ? "bg-[var(--bw-navy)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "navy" ? "Navy" : "Cream"}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => downloadFromUrl(previewSrc, downloadFilename)}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            <Download className="h-4 w-4 mr-1" /> Download PNG
          </Button>
        </div>
      </div>
      <div className="flex-1 p-6 bg-muted/30 flex items-center justify-center">
        <div className={previewClassName}>
          <img
            src={previewSrc}
            alt={`${title} preview (${variant})`}
            className="w-full h-full object-contain rounded"
          />
        </div>
      </div>
      <div className="p-3 border-t text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Where to use: </span>
        {whereToUse}
      </div>
    </div>
  );
}
