import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  AlertTriangle,
  X,
  Mail,
  Download,
  UserX,
  LogOut,
} from "lucide-react";
import JSZip from "jszip";
import { generateResultsPdf } from "@/lib/generateResultsPdf";
import { generateNaiPdf } from "@/lib/generateNaiPdf";
import { assemblePtpPdfData, assembleNaiPdfData } from "@/lib/assemblePdfDataForUser";
import type { PdfSections } from "@/components/results/ExportPdfModal";
import { format } from "date-fns";

export default function Departed() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const profileQuery = useQuery({
    queryKey: ["departed-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select(
          "id, email, full_name, account_type, account_status, deactivated_at, reactivation_deadline, personal_email_pending, organization_id",
        )
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const profile = profileQuery.data;

  const orgQuery = useQuery({
    queryKey: ["departed-org", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", profile!.organization_id!)
        .single();
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const orgName = orgQuery.data?.name ?? null;

  // Redirect guards
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const now = Date.now();
      const deadline = profile.reactivation_deadline
        ? new Date(profile.reactivation_deadline).getTime()
        : 0;
      if (
        profile.account_status === "pseudonymized" ||
        profile.account_status === "departed_individual" ||
        (profile.deactivated_at && now > deadline)
      ) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      if (profile.account_status === "active" && !profile.deactivated_at) {
        navigate("/dashboard", { replace: true });
      }
    })();
  }, [profile, signOut, navigate]);

  // Pending conversion handlers
  const [cancelling, setCancelling] = useState(false);
  const [resending, setResending] = useState(false);

  const handleCancelConversion = async () => {
    setCancelling(true);
    const { error } = await supabase.rpc("cancel_individual_conversion");
    setCancelling(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["departed-profile"] });
    toast({ title: "Verification cancelled. You can choose again." });
  };

  const handleResendVerification = async () => {
    if (!profile?.personal_email_pending) return;
    setResending(true);
    const cancelRes = await supabase.rpc("cancel_individual_conversion");
    if (cancelRes.error) {
      setResending(false);
      toast({ title: "Error", description: cancelRes.error.message, variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.rpc("corporate_employee_choose_individual", {
      p_personal_email: profile.personal_email_pending,
    });
    setResending(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    const rpcData = data as any;
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const sendRes = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-departure-emails`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          mode: "verify_conversion",
          user_id: user.id,
          personal_email: rpcData?.personal_email_pending ?? profile.personal_email_pending,
          conversion_token: rpcData?.conversion_token,
          token_expires_at: rpcData?.expires_at,
          app_origin: window.location.origin,
        }),
      }
    );
    const sendJson = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok || !sendJson.success) {
      qc.invalidateQueries({ queryKey: ["departed-profile"] });
      toast({
        title: "Email failed to send",
        description: `We saved your request but could not send the verification email (${sendJson.error || `HTTP ${sendRes.status}`}). Try the Resend button again or contact support.`,
        variant: "destructive",
      });
      return;
    }
    qc.invalidateQueries({ queryKey: ["departed-profile"] });
    toast({
      title: "Verification link sent",
      description: `New verification link sent to ${profile.personal_email_pending}`,
    });
  };

  // Conversion modal state
  const [conversionModalOpen, setConversionModalOpen] = useState(false);
  const [conversionEmail, setConversionEmail] = useState("");
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionSubmitting, setConversionSubmitting] = useState(false);

  const handleSubmitConversion = async () => {
    setConversionError(null);
    const trimmedEmail = conversionEmail.trim();
    if (!trimmedEmail.includes("@") || !trimmedEmail.split("@")[1]?.includes(".")) {
      setConversionError("Please enter a valid email address.");
      return;
    }
    if (profile?.email && trimmedEmail.toLowerCase() === profile.email.toLowerCase()) {
      setConversionError("Please use a personal email different from your current corporate email.");
      return;
    }
    setConversionSubmitting(true);
    const { data, error } = await supabase.rpc("corporate_employee_choose_individual", {
      p_personal_email: trimmedEmail,
    });
    setConversionSubmitting(false);
    if (error) {
      if ((error as any).code === "23505") {
        setConversionError("This email is already in use. Please choose a different address.");
      } else {
        setConversionError(error.message);
      }
      return;
    }
    const rpcData = data as any;
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const sendRes = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-departure-emails`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          mode: "verify_conversion",
          user_id: user.id,
          personal_email: rpcData?.personal_email_pending ?? trimmedEmail,
          conversion_token: rpcData?.conversion_token,
          token_expires_at: rpcData?.expires_at,
          app_origin: window.location.origin,
        }),
      }
    );
    const sendJson = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok || !sendJson.success) {
      setConversionError(
        `We saved your request but could not send the verification email (${sendJson.error || `HTTP ${sendRes.status}`}). Try the Resend button on the next screen.`
      );
      setConversionModalOpen(false);
      setConversionEmail("");
      qc.invalidateQueries({ queryKey: ["departed-profile"] });
      return;
    }
    setConversionModalOpen(false);
    setConversionEmail("");
    qc.invalidateQueries({ queryKey: ["departed-profile"] });
    toast({
      title: "Verification link sent",
      description: `Check ${trimmedEmail} and click the link to complete the transfer.`,
    });
  };

  // Download modal state
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadStage, setDownloadStage] = useState<
    "idle" | "generating" | "uploading" | "finalizing" | "done" | "error"
  >("idle");
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const resetDownload = () => {
    setDownloadStage("idle");
    setDownloadProgress(null);
    setDownloadError(null);
  };

  const handleStartDownload = async () => {
    if (!user || !profile) return;
    setDownloadStage("generating");
    setDownloadError(null);

    try {
      // 1. Fetch all assessment_results for this user
      const { data: results, error: resultsErr } = await supabase
        .from("assessment_results")
        .select("id, assessment_id, instrument_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (resultsErr) throw resultsErr;
      if (!results || results.length === 0) {
        setDownloadError("You don't have any completed assessments to export.");
        setDownloadStage("error");
        return;
      }

      // 2. Fetch assessment context_types
      const assessmentIds = results.map((r) => r.assessment_id);
      const { data: assessmentRows } = await supabase
        .from("assessments")
        .select("id, context_type")
        .in("id", assessmentIds);
      const ctxMap = new Map(
        (assessmentRows ?? []).map((a) => [a.id, a.context_type]),
      );

      setDownloadProgress({ current: 0, total: results.length });

      // 3. Generate one PDF per result
      const zip = new JSZip();
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const isPTP = (r.instrument_id ?? "").toUpperCase().includes("INST-001");
        const isNAI = (r.instrument_id ?? "").includes("INST-002");
        let blob: Blob | null = null;
        let filename = "assessment.pdf";

        try {
          if (isPTP) {
            const ctx = ctxMap.get(r.assessment_id);
            const contextTab: "professional" | "personal" | "combined" | null =
              ctx === "both" ? "combined" : ((ctx as any) ?? null);
            const sections: PdfSections = {
              profileOverview: true,
              drivingFacetScores: true,
              profileOverviewNarrative: true,
              ptpBrainOverview: true,
              dimensionHighlights: true,
              drivingFacetInsights: true,
              crossAssessmentConnections: true,
              assessmentResponses: true,
            };
            const pdfData = await assemblePtpPdfData({
              userId: user.id,
              assessmentResultId: r.id,
              contextTab,
              displayName: profile.full_name ?? null,
              sections,
            });
            blob = generateResultsPdf(pdfData, sections, { returnBlob: true }) as Blob;
            const ctxSuffix =
              contextTab && contextTab !== "combined"
                ? `-${contextTab}`
                : contextTab === "combined"
                  ? "-combined"
                  : "";
            filename = `BrainWise-PTP${ctxSuffix}-${r.id.slice(0, 8)}.pdf`;
          } else if (isNAI) {
            const naiData = await assembleNaiPdfData({
              userId: user.id,
              assessmentResultId: r.id,
              isCoachView: false,
              displayName: profile.full_name ?? null,
            });
            const naiSections = {
              profileOverview: true,
              profileOverviewNarrative: true,
              naiOverview: true,
              dimensionHighlights: true,
              patternAlert: false,
              individualResponses: true,
              cafesPtpMapping: false,
              crossAssessmentInterpretation: true,
              assessmentResponses: true,
            };
            blob = generateNaiPdf(naiData, naiSections, { returnBlob: true }) as Blob;
            filename = `BrainWise-NAI-${r.id.slice(0, 8)}.pdf`;
          } else {
            continue;
          }

          if (blob) zip.file(filename, blob);
        } catch (perAssessmentErr: any) {
          console.error(`Failed to generate PDF for result ${r.id}:`, perAssessmentErr);
        }

        setDownloadProgress({ current: i + 1, total: results.length });
      }

      // 4. Build the ZIP blob
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

      // 5. Phase 1: prepare upload URL
      setDownloadStage("uploading");
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      if (!token) throw new Error("Not signed in");

      const prepareRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-departure-export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ phase: "prepare" }),
        },
      );
      const prepareJson = await prepareRes.json();
      if (!prepareRes.ok || !prepareJson.success) {
        throw new Error(prepareJson.error || `Prepare failed (HTTP ${prepareRes.status})`);
      }

      // 6. PUT the ZIP to upload_url
      const uploadRes = await fetch(prepareJson.upload_url, {
        method: "PUT",
        headers: { "Content-Type": "application/zip" },
        body: zipBlob,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload failed (HTTP ${uploadRes.status})`);
      }

      // 7. Phase 2: finalize
      setDownloadStage("finalizing");
      const finalizeRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-departure-export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ phase: "finalize", object_path: prepareJson.object_path }),
        },
      );
      const finalizeJson = await finalizeRes.json();
      if (!finalizeRes.ok || !finalizeJson.success) {
        throw new Error(finalizeJson.error || `Finalize failed (HTTP ${finalizeRes.status})`);
      }

      setDownloadStage("done");
    } catch (err: any) {
      setDownloadError(err.message || "Unknown error");
      setDownloadStage("error");
    }
  };

  // Pseudonymize modal state
  const [pseudonymizeModalOpen, setPseudonymizeModalOpen] = useState(false);
  const [pseudonymizePhrase, setPseudonymizePhrase] = useState("");
  const [pseudonymizeSubmitting, setPseudonymizeSubmitting] = useState(false);
  const [pseudonymizeError, setPseudonymizeError] = useState<string | null>(null);

  const handleSubmitPseudonymize = async () => {
    setPseudonymizeError(null);
    setPseudonymizeSubmitting(true);
    const { error } = await supabase.rpc("corporate_employee_run_pseudonym_now", {
      p_confirmation_phrase: pseudonymizePhrase,
    });
    if (error) {
      setPseudonymizeError(error.message);
      setPseudonymizeSubmitting(false);
      return;
    }
    await signOut();
    navigate("/login", { replace: true });
  };

  if (profileQuery.isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F1]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F1] flex items-start justify-center px-4 py-12">
      <Card className="w-full max-w-[600px] shadow-lg bg-white">
        <CardContent className="p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Your access to {orgName ?? "your organization"} has ended
            </h1>
            <p className="text-muted-foreground mt-3">
              {profile.full_name ?? profile.email}, you have until{" "}
              <span className="font-medium text-foreground">
                {profile.reactivation_deadline
                  ? format(new Date(profile.reactivation_deadline), "MMMM d, yyyy")
                  : "—"}
              </span>{" "}
              to choose what happens to your assessment data. After that, your records will be
              automatically de-identified and you will not be able to recover them.
            </p>
          </div>

          {profile.personal_email_pending && (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Verification email sent</AlertTitle>
              <AlertDescription>
                <p>
                  We sent a verification link to{" "}
                  <span className="font-medium">{profile.personal_email_pending}</span>. Click the
                  link in your email to complete the transfer.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelConversion}
                    disabled={cancelling || resending}
                  >
                    {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cancel and choose differently
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={cancelling || resending}
                  >
                    {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Resend verification
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => setConversionModalOpen(true)}
              disabled={!!profile.personal_email_pending}
            >
              <Mail className="mr-2 h-4 w-4" />
              Convert to a personal account
            </Button>
            <Button size="lg" variant="outline" onClick={() => setDownloadModalOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Download my data
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setPseudonymizeModalOpen(true)}
            >
              <UserX className="mr-2 h-4 w-4" />
              De-identify me now
            </Button>
          </div>

          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Modal */}
      <Dialog
        open={conversionModalOpen}
        onOpenChange={(open) => {
          setConversionModalOpen(open);
          if (!open) {
            setConversionEmail("");
            setConversionError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to a personal BrainWise account</DialogTitle>
            <DialogDescription>
              Provide your personal email address. We'll send a verification link. Once you click
              it, your account transfers to that email and you can log in there. Your assessment
              history, scores, and insights all transfer with you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="conversion-email">Personal email</Label>
            <Input
              id="conversion-email"
              type="email"
              value={conversionEmail}
              onChange={(e) => setConversionEmail(e.target.value)}
              placeholder="you@personal.com"
              disabled={conversionSubmitting}
            />
          </div>
          {conversionError && (
            <Alert variant="destructive">
              <AlertDescription>{conversionError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConversionModalOpen(false)}
              disabled={conversionSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitConversion} disabled={conversionSubmitting}>
              {conversionSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send verification link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Modal */}
      <Dialog
        open={downloadModalOpen}
        onOpenChange={(open) => {
          if (
            downloadStage === "generating" ||
            downloadStage === "uploading" ||
            downloadStage === "finalizing"
          ) {
            return; // prevent close during in-flight
          }
          setDownloadModalOpen(open);
          if (!open) resetDownload();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download your assessment data</DialogTitle>
            <DialogDescription>
              We'll generate PDFs for all your completed assessments and email you a download link
              when it's ready. The link expires in 7 days.
            </DialogDescription>
          </DialogHeader>

          {downloadStage === "idle" && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Keep this tab open</AlertTitle>
                <AlertDescription>
                  We'll generate your PDFs in your browser, then upload them as a ZIP. Closing this
                  tab during the upload will cancel the download. The whole process usually takes
                  10-30 seconds.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                When you're ready, click "Start" below.
              </p>
            </div>
          )}

          {(downloadStage === "generating" ||
            downloadStage === "uploading" ||
            downloadStage === "finalizing") && (
            <div className="py-2">
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Don't close this tab</AlertTitle>
                <AlertDescription>
                  {downloadStage === "generating"
                    ? `Generating PDFs (${downloadProgress?.current ?? 0} of ${downloadProgress?.total ?? 0})...`
                    : downloadStage === "uploading"
                      ? "Uploading ZIP to BrainWise..."
                      : "Finishing up..."}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {downloadStage === "done" && (
            <Alert>
              <AlertTitle>Download ready</AlertTitle>
              <AlertDescription>
                We've emailed you a link to download your data. Check your inbox at{" "}
                <span className="font-medium">{profile.email}</span>.
              </AlertDescription>
            </Alert>
          )}

          {downloadStage === "error" && (
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{downloadError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            {downloadStage === "idle" && (
              <>
                <Button variant="outline" onClick={() => setDownloadModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStartDownload}>Start</Button>
              </>
            )}
            {downloadStage === "done" && (
              <Button
                onClick={() => {
                  setDownloadModalOpen(false);
                  resetDownload();
                }}
              >
                Close
              </Button>
            )}
            {downloadStage === "error" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDownloadModalOpen(false);
                    resetDownload();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleStartDownload}>Try again</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pseudonymize Modal */}
      <Dialog
        open={pseudonymizeModalOpen}
        onOpenChange={(open) => {
          setPseudonymizeModalOpen(open);
          if (!open) {
            setPseudonymizePhrase("");
            setPseudonymizeError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>De-identify your account now</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>This cannot be undone</AlertTitle>
              <AlertDescription>
                Your name, email address, and team information will be permanently replaced with
                anonymous placeholders. You will be signed out immediately and will not be able to
                sign back in. Your assessment scores will remain in{" "}
                {orgName ?? "the organization"}'s aggregate data but cannot be linked back to you.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="pseudonymize-phrase">
                To confirm, type{" "}
                <span className="font-mono font-medium">delete my identity</span> below.
              </Label>
              <Input
                id="pseudonymize-phrase"
                type="text"
                value={pseudonymizePhrase}
                onChange={(e) => setPseudonymizePhrase(e.target.value)}
                placeholder="delete my identity"
                disabled={pseudonymizeSubmitting}
              />
            </div>

            {pseudonymizeError && (
              <Alert variant="destructive">
                <AlertDescription>{pseudonymizeError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPseudonymizeModalOpen(false)}
              disabled={pseudonymizeSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitPseudonymize}
              disabled={
                pseudonymizeSubmitting || pseudonymizePhrase !== "delete my identity"
              }
            >
              {pseudonymizeSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Permanently de-identify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
