import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Download, FileText, Linkedin } from "lucide-react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import CertificateCanvas from "@/components/certification/CertificateCanvas";

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

const BADGES = [
  {
    label: "LinkedIn badge — Light",
    src: "/badges/ptp-coach-linkedin-badge-light.png",
    filename: "BrainWise-PTP-Coach-LinkedIn-Badge-Light.png",
    group: "badge" as const,
  },
  {
    label: "LinkedIn badge — Dark",
    src: "/badges/ptp-coach-linkedin-badge-dark.png",
    filename: "BrainWise-PTP-Coach-LinkedIn-Badge-Dark.png",
    group: "badge" as const,
  },
  {
    label: "Email signature — Light",
    src: "/badges/ptp-coach-email-banner-light.png",
    filename: "BrainWise-PTP-Coach-Email-Banner-Light.png",
    group: "banner" as const,
  },
  {
    label: "Email signature — Dark",
    src: "/badges/ptp-coach-email-banner-dark.png",
    filename: "BrainWise-PTP-Coach-Email-Banner-Dark.png",
    group: "banner" as const,
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

export default function CertificationPage() {
  const { certificationId } = useParams<{ certificationId: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const credentialQuery = useQuery({
    queryKey: ["certification-credential", certificationId],
    enabled: !!certificationId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_certification_credential" as never,
        { p_certification_id: certificationId } as never,
      );
      if (error) throw error;
      return data as unknown as CredentialResult;
    },
  });

  if (credentialQuery.isLoading || !userId) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (credentialQuery.isError || !credentialQuery.data) {
    const msg = (credentialQuery.error as any)?.message ?? "";
    let display = "Could not load this certification. Please try again.";
    if (msg.includes("access_denied")) display = "You don't have access to this certification.";
    else if (msg.includes("certification_not_found"))
      display = "This certification could not be found.";
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="rounded-md border border-destructive/30 bg-card p-6 text-destructive">
          {display}
        </div>
      </div>
    );
  }

  const cred = credentialQuery.data;
  const { certification, display_name, recipient, certification_path_id, is_certified } = cred;

  // Non-credential state
  if (!is_certified) {
    const isRevoked = certification.status === "revoked";
    return (
      <div className="space-y-6 pb-10 px-4 sm:px-6 pt-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="rounded-lg border bg-card p-6 space-y-3">
          <h1 className="text-xl font-semibold">{display_name}</h1>
          <p className="text-sm text-muted-foreground">
            {isRevoked
              ? "This certification is no longer active."
              : "This certification is not yet complete. Finish the certification path to unlock your certificate."}
          </p>
          {certification_path_id && (
            <Button
              className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
              onClick={() => navigate(`/learning/cert-path/${certification_path_id}`)}
            >
              View certification path
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Certified
  const certType = certification.certification_type;
  const hasTemplate = certType === "ptp_coach";
  const certifiedAt = certification.certified_at;
  const awardedDate = certifiedAt ? format(new Date(certifiedAt), "MMMM d, yyyy") : "";

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

  const handleLinkedIn = () => {
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: display_name,
      organizationId: LINKEDIN_ORG_ID,
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

  const handleBadgeDownload = async (src: string, filename: string) => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      triggerDownload(blob, filename);
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="space-y-6 pb-10 px-4 sm:px-6 pt-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[var(--bw-navy)]">{display_name}</h1>
        <p className="text-sm text-muted-foreground">
          Awarded to {recipient.full_name}
          {awardedDate ? ` on ${awardedDate}` : ""}
        </p>
      </header>

      {hasTemplate ? (
        <>
          <div className="rounded-lg overflow-hidden border bg-[var(--bw-navy)] shadow-sm">
            <CertificateCanvas
              recipientName={recipient.full_name}
              certifiedAt={certifiedAt}
              certificationType={certType}
              onReady={handleCanvasReady}
            />
          </div>

          <div className="flex flex-wrap gap-3">
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
            <Button onClick={handleLinkedIn} variant="outline">
              <Linkedin className="h-4 w-4 mr-2" /> Share on LinkedIn
            </Button>
          </div>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--bw-navy)]">Badges</h2>
              <p className="text-sm text-muted-foreground">
                Add these to your LinkedIn profile or email signature.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">LinkedIn badge</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {BADGES.filter((b) => b.group === "badge").map((b) => (
                    <div
                      key={b.src}
                      className="flex items-center gap-3 rounded-md border p-3 bg-card"
                    >
                      <img
                        src={b.src}
                        alt={b.label}
                        className="h-16 w-16 object-contain rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{b.label}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBadgeDownload(b.src, b.filename)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Email signature banner</h3>
                <div className="grid gap-3">
                  {BADGES.filter((b) => b.group === "banner").map((b) => (
                    <div
                      key={b.src}
                      className="flex items-center gap-3 rounded-md border p-3 bg-card"
                    >
                      <img
                        src={b.src}
                        alt={b.label}
                        className="h-12 w-40 object-contain rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{b.label}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBadgeDownload(b.src, b.filename)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleLinkedIn} variant="outline">
              <Linkedin className="h-4 w-4 mr-2" /> Share on LinkedIn
            </Button>
          </div>
          <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
            The downloadable certificate and badges for this certification type are coming soon.
          </div>
        </>
      )}
    </div>
  );
}
