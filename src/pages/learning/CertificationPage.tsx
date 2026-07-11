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
      navy: "/badges/ptp-coach-linkedin-badge-dark.png",
      cream: "/badges/ptp-coach-linkedin-badge-light.png",
    },
    banner: {
      navy: "/badges/ptp-coach-email-banner-dark.png",
      cream: "/badges/ptp-coach-email-banner-light.png",
    },
  },
};

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

  const handlePng = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      triggerDownload(blob, `BrainWise-${certType}-Certificate.png`);
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
    pdf.save(`BrainWise-${certType}-Certificate.pdf`);
  };

  const verifyUrl = `${window.location.origin}/verify/cert/${certification.certification_id}`;
  const suggestedCaption =
    `I'm proud to be ${display_name} through BrainWise Enterprises! ` +
    `You can verify my credential here: ${verifyUrl}`;

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

  const handleSharePost = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(suggestedCaption);
      toast.success("Caption copied — paste it into your LinkedIn post.");
    } catch {
      toast.error("Couldn't copy. You can select and copy the caption manually.");
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
        <Button onClick={handleSharePost} variant="outline">
          <Linkedin className="h-4 w-4 mr-2" /> Share as a post
        </Button>
        <Button onClick={handleCopyCaption} variant="outline">
          <Copy className="h-4 w-4 mr-2" /> Copy caption
        </Button>
      </div>

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
              downloadFilename={`BrainWise-${certType}-LinkedIn-Badge-${
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
              downloadFilename={`BrainWise-${certType}-Email-Banner-${
                bannerVariant === "navy" ? "Navy" : "Cream"
              }.png`}
              whereToUse="Gmail/Outlook signature, newsletter footer."
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">Quick usage notes</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                LinkedIn Certifications: add as a Certification with issuer "BrainWise Enterprises".
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
