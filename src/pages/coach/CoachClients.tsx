import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Users, ClipboardCheck, Clock, Plus, Send, Eye, Mail, ArrowLeft, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import BulkInviteModal from "@/components/coach/BulkInviteModal";
import ShareableLinkModal from "@/components/coach/ShareableLinkModal";
import PendingInvitations from "@/components/coach/PendingInvitations";

const INSTRUMENTS = [
  { id: "PTP", uuid: "02618e9a-d411-44cf-b316-fe368edeac03", name: "Personal Threat Profile", desc: "Measures nonconscious threat responses influencing behavior." },
  { id: "NAI", uuid: "77d1290f-1daf-44e0-931f-b9b8ad185520", name: "Neuroscience Adoption Index", desc: "Measures beliefs and threat responses related to AI adoption." },
  { id: "AIRSA", uuid: "abb62120-8cc8-435f-babc-dd6a27fbc235", name: "AI Readiness Skills Assessment", desc: "Assesses readiness to adopt and leverage AI tools." },
  { id: "HSS", uuid: "90216d9d-153c-4b7b-abe0-1d7845c9e6e0", name: "Habit Stabilization Scorecard", desc: "Measures stability of behavioral changes related to AI." },
];

const CERT_TYPE_TO_INSTRUMENTS: Record<string, string[]> = {
  ptp_coach: ["PTP"],
  ai_transformation_coach: ["NAI", "AIRSA", "HSS"],
  ai_transformation_ptp_coach: ["PTP", "NAI", "AIRSA", "HSS"],
  my_brainwise_coach: ["PTP", "NAI", "AIRSA", "HSS"],
};

interface ClientRow {
  id: string;
  client_email: string;
  client_user_id: string | null;
  client_name: string | null;
  invitation_status: string;
  assessment_id: string | null;
  assessment_status: string | null;
  completed_at: string | null;
  instrument_name: string | null;
  created_at: string;
  stripe_payment_intent_id: string | null;
  debrief_completed: boolean;
  results_released: boolean;
}

interface UniqueClient {
  client_email: string;
  client_user_id: string | null;
  client_name: string | null;
  assessment_count: number;
  completed_count: number;
  pending_count: number;
}

export default function CoachClients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [uniqueClients, setUniqueClients] = useState<UniqueClient[]>([]);
  const [selectedClientEmail, setSelectedClientEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [instrumentError, setInstrumentError] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [resultsReleased, setResultsReleased] = useState(false);
  const [allowedInstrumentIds, setAllowedInstrumentIds] = useState<Set<string>>(new Set());
  const [certsLoaded, setCertsLoaded] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [shareableModalOpen, setShareableModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"clients" | "pending">("clients");
  const [perAssessmentPrice, setPerAssessmentPrice] = useState<number | null>(null);

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);

    const { data: ccRows } = await supabase
      .from("coach_clients")
      .select("id, client_email, client_user_id, invitation_status, assessment_id, instrument_id, coach_notes, created_at, stripe_payment_intent_id, debrief_completed, results_released")
      .eq("coach_user_id", user.id)
      .order("created_at", { ascending: false });

    if (!ccRows) { setLoading(false); return; }

    const enriched: ClientRow[] = [];

    for (const cc of ccRows) {
      let clientName: string | null = null;
      let assessmentStatus: string | null = null;
      let completedAt: string | null = null;
      let instrumentName: string | null = null;

      if (cc.client_user_id) {
        const { data: u } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", cc.client_user_id)
          .single();
        clientName = u?.full_name || null;
      }

      if (cc.assessment_id) {
        const { data: a } = await supabase
          .from("assessments")
          .select("status, completed_at, instrument_id")
          .eq("id", cc.assessment_id)
          .single();
        if (a) {
          assessmentStatus = a.status;
          completedAt = a.completed_at;
          const { data: inst } = await supabase
            .from("instruments")
            .select("instrument_name")
            .eq("instrument_id", a.instrument_id)
            .limit(1)
            .single();
          instrumentName = inst?.instrument_name || a.instrument_id;
        }
      } else if (cc.instrument_id) {
        // No assessment yet, but we have the instrument_id from coach_clients
        const instMatch = INSTRUMENTS.find(i => i.uuid === cc.instrument_id);
        instrumentName = instMatch?.name || null;
        if (!instrumentName) {
          // Try DB lookup by UUID id column
          const { data: inst } = await supabase
            .from("instruments")
            .select("instrument_name")
            .eq("id", cc.instrument_id)
            .limit(1)
            .single();
          instrumentName = inst?.instrument_name || null;
        }
      }

      enriched.push({
        id: cc.id,
        client_email: cc.client_email,
        client_user_id: cc.client_user_id,
        client_name: clientName,
        invitation_status: cc.invitation_status,
        assessment_id: cc.assessment_id,
        assessment_status: assessmentStatus,
        completed_at: completedAt,
        instrument_name: instrumentName,
        created_at: cc.created_at,
        stripe_payment_intent_id: cc.stripe_payment_intent_id,
        debrief_completed: cc.debrief_completed,
        results_released: cc.results_released,
      });
    }

    // Derive unique clients
    const clientMap: Record<string, UniqueClient> = {};
    for (const row of enriched) {
      const e = row.client_email;
      if (!clientMap[e]) {
        clientMap[e] = {
          client_email: e,
          client_user_id: row.client_user_id,
          client_name: row.client_name,
          assessment_count: 0,
          completed_count: 0,
          pending_count: 0,
        };
      }
      clientMap[e].assessment_count++;
      if (row.assessment_status === "completed") clientMap[e].completed_count++;
      if (row.invitation_status === "sent" || row.invitation_status === "opened") clientMap[e].pending_count++;
      if (!clientMap[e].client_name && row.client_name) clientMap[e].client_name = row.client_name;
      if (!clientMap[e].client_user_id && row.client_user_id) clientMap[e].client_user_id = row.client_user_id;
    }

    setClients(enriched);
    setUniqueClients(Object.values(clientMap));
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("coach_certifications")
        .select("certification_type, status")
        .eq("user_id", user.id)
        .eq("status", "certified");
      if (error) {
        console.error("coach_certifications fetch error:", error);
        setAllowedInstrumentIds(new Set());
        setCertsLoaded(true);
        return;
      }
      const allowed = new Set<string>();
      (data ?? []).forEach((row: any) => {
        const ids = CERT_TYPE_TO_INSTRUMENTS[row.certification_type] ?? [];
        ids.forEach(id => allowed.add(id));
      });
      setAllowedInstrumentIds(allowed);
      setCertsLoaded(true);
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("price_usd")
        .eq("plan_name", "Per Assessment")
        .eq("billing_period", "one_time")
        .eq("is_active", true)
        .single();
      if (error) {
        console.error("[CoachClients] Per Assessment price lookup failed:", error);
        setPerAssessmentPrice(null);
        return;
      }
      setPerAssessmentPrice(Number(data.price_usd));
    })();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bulkCheckout = params.get("bulk_checkout");
    if (bulkCheckout === "success") {
      toast.success("Bulk order completed", {
        description: "Your client invitations have been sent.",
      });
      fetchClients();
      params.delete("bulk_checkout");
      params.delete("session_id");
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState({}, "", newUrl);
    } else if (bulkCheckout === "cancelled") {
      toast.error("Checkout cancelled", {
        description: "Your batch was not sent.",
      });
      params.delete("bulk_checkout");
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  const resetForm = () => {
    setFirstName(""); setLastName(""); setEmail(""); setNote("");
    setSelectedInstruments([]); setInstrumentError(false);
    setResultsReleased(false);
  };

  const toggleInstrument = (instrumentId: string) => {
    setInstrumentError(false);
    setSelectedInstruments(prev =>
      prev.includes(instrumentId)
        ? prev.filter(id => id !== instrumentId)
        : [...prev, instrumentId]
    );
  };

  const getSelectedUuids = (): string => {
    return selectedInstruments
      .map(id => INSTRUMENTS.find(i => i.id === id)?.uuid)
      .filter(Boolean)
      .join(",");
  };

  const handleOrderCoachPays = async () => {
    if (!user || !email) {
      toast.error("Please fill in client email.");
      return;
    }
    if (selectedInstruments.length === 0) {
      setInstrumentError(true);
      toast.error("Please select at least one assessment instrument.");
      return;
    }
    setSubmitting(true);
    try {
      const instrumentIds = getSelectedUuids();
      const payload = {
        price_id: "price_1TS3WY2FY7qIyIXAalOKbxdZ",
        mode: "coach_order",
        instrument_ids: instrumentIds,
        quantity: selectedInstruments.length,
        client_email: email,
        client_first_name: firstName,
        client_last_name: lastName,
        coach_note: note,
        results_released: resultsReleased,
      };
      console.log("[CoachClients] create-checkout payload:", JSON.stringify(payload, null, 2));

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: payload,
      });
      console.log("[CoachClients] create-checkout response:", JSON.stringify({ data, error }));
      if (error) {
        let errorMsg = "Edge function error";
        try {
          if (error instanceof Error) errorMsg = error.message;
          if (typeof error === "object" && "context" in error) {
            const body = await (error as any).context?.json?.();
            if (body?.error) errorMsg = body.error;
          }
        } catch { /* ignore parse errors */ }
        throw new Error(errorMsg);
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error("[CoachClients] No URL in response data:", data);
        throw new Error("No checkout URL returned. Response: " + JSON.stringify(data));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to start checkout: " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderClientPays = async () => {
    if (!user || !email) {
      toast.error("Please fill in client email.");
      return;
    }
    if (selectedInstruments.length === 0) {
      setInstrumentError(true);
      toast.error("Please select at least one assessment instrument.");
      return;
    }
    setSubmitting(true);

    // Create one coach_clients record per selected instrument
    const instrumentUuids = selectedInstruments
      .map(id => INSTRUMENTS.find(i => i.id === id)?.uuid)
      .filter(Boolean) as string[];

    let hasError = false;
    for (const uuid of instrumentUuids) {
      const { error } = await supabase.from("coach_clients").insert({
        coach_user_id: user.id,
        client_email: email,
        invitation_status: "sent",
        coach_notes: note || null,
        instrument_id: uuid,
        results_released: resultsReleased,
      });
      if (error) {
        toast.error("Failed to create client record: " + error.message);
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      // Build and send invitation email
      const selectedNames = selectedInstruments
        .map(id => INSTRUMENTS.find(i => i.id === id)?.name)
        .filter(Boolean) as string[];

      const instrumentListHtml = selectedNames
        .map(n => `<li style="margin-bottom:6px;">${n}</li>`)
        .join("");

      const coachNoteHtml = note
        ? `<blockquote style="border-left:4px solid #F5741A;margin:20px 0;padding:12px 16px;background:#ffffff;border-radius:4px;font-style:italic;color:#4B4751;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">"${note}"</blockquote>`
        : "";

      const signupUrl = `${window.location.origin}/signup?email=${encodeURIComponent(email)}`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9F7F1;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F1;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#021F36;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-family:'Poppins','Helvetica Neue',Arial,sans-serif;font-weight:800;letter-spacing:-0.01em;">BrainWise Enterprises</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-size:20px;color:#021F36;margin:0 0 16px;font-family:'Poppins','Helvetica Neue',Arial,sans-serif;font-weight:700;letter-spacing:-0.01em;">Hi ${firstName || "there"},</h2>
          <p style="font-size:15px;color:#4B4751;line-height:1.6;margin:0 0 16px;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;font-weight:400;">
            You've been invited to complete a BrainWise assessment${selectedNames.length > 1 ? "s" : ""}. When you register, you'll be able to choose your preferred payment method.
          </p>
          <ul style="font-size:15px;color:#4B4751;line-height:1.8;padding-left:20px;margin:0 0 16px;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
            ${instrumentListHtml}
          </ul>
          ${coachNoteHtml}
          <p style="font-size:14px;color:#4B4751;margin:0 0 28px;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
            Please complete your assessment${selectedNames.length > 1 ? "s" : ""} within <strong>14 days</strong> of receiving this invitation.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td style="background:#F5741A;border-radius:999px;padding:14px 28px;">
            <a href="${signupUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">Get Started</a>
          </td></tr></table>
          <p style="font-size:14px;color:#4B4751;margin:0;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">Best regards,<br/><strong>The BrainWise Team</strong></p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #EDEAE0;text-align:center;">
          <p style="font-size:12px;color:#6D6875;margin:0;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">© ${new Date().getFullYear()} BrainWise Enterprises. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

      try {
        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: {
            to: email,
            subject: "You've Been Invited to Complete a BrainWise Assessment",
            html,
          },
        });
        if (emailError) {
          console.error("[CoachClients] send-email error:", emailError);
          toast.warning("Client records created but invitation email failed to send.");
        } else {
          toast.success("Invitation sent!", {
            description: `${firstName} ${lastName} (${email}) has been invited for ${selectedNames.length} assessment${selectedNames.length > 1 ? "s" : ""}.`,
          });
        }
      } catch (emailErr) {
        console.error("[CoachClients] send-email exception:", emailErr);
        toast.warning("Client records created but invitation email failed to send.");
      }

      resetForm();
      setModalOpen(false);
      fetchClients();
    }

    setSubmitting(false);
  };

  // Stats
  // totalSignedUpClients: distinct emails where the client has a user account
  // (client_user_id IS NOT NULL means signup completed and trigger fired).
  const totalSignedUpClients = new Set(
    clients.filter(c => c.client_user_id !== null).map(c => c.client_email)
  ).size;

  // pendingInvitationsCount: distinct rows still awaiting redemption
  // (matches PendingInvitations card query).
  const pendingInvitationsCount = clients.filter(c =>
    (c.invitation_status === "sent" || c.invitation_status === "opened") &&
    c.assessment_id === null
  ).length;

  const completedThisMonth = clients.filter(c => {
    if (!c.completed_at) return false;
    const d = new Date(c.completed_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // assessmentsPending: assessments started but not yet completed
  // (distinct from pending invitations: these have an assessment_id).
  const assessmentsPending = clients.filter(c =>
    c.assessment_id !== null && c.assessment_status !== "completed"
  ).length;

  const getStatusBadge = (status: string | null, invitationStatus: string) => {
    if (!status) {
      if (invitationStatus === "sent") return <Badge variant="secondary">Sent</Badge>;
      if (invitationStatus === "opened") return <Badge variant="secondary">Opened</Badge>;
      return <Badge variant="outline">Pending</Badge>;
    }
    switch (status) {
      case "completed": return <Badge className="bg-accent text-accent-foreground">Completed</Badge>;
      case "in_progress": return <Badge variant="secondary">In Progress</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRemind = async (client: ClientRow) => {
    setSendingReminderId(client.id);
    const instrumentName = client.instrument_name || "your assessment";
    const signupUrl = `${window.location.origin}/signup?email=${encodeURIComponent(client.client_email)}`;
    const clientName = client.client_name?.split(" ")[0] || client.client_email.split("@")[0];
    const coachPaid = !!client.stripe_payment_intent_id;

    const bodyText = coachPaid
      ? "This is a friendly reminder that your coach has purchased a BrainWise assessment for you and it's waiting to be completed."
      : "This is a friendly reminder that you have a BrainWise assessment waiting. When you register, you'll be able to choose your preferred payment method.";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9F7F1;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F1;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#021F36;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-family:'Poppins','Helvetica Neue',Arial,sans-serif;font-weight:800;letter-spacing:-0.01em;">BrainWise Enterprises</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-size:20px;color:#021F36;margin:0 0 16px;font-family:'Poppins','Helvetica Neue',Arial,sans-serif;font-weight:700;letter-spacing:-0.01em;">Hi ${clientName},</h2>
          <p style="font-size:15px;color:#4B4751;line-height:1.6;margin:0 0 16px;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
            ${bodyText}
          </p>
          <p style="font-size:15px;color:#4B4751;line-height:1.6;margin:0 0 8px;font-weight:600;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">Your assessment:</p>
          <ul style="font-size:15px;color:#4B4751;line-height:1.8;padding-left:20px;margin:0 0 16px;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
            <li>${instrumentName}</li>
          </ul>
          <p style="font-size:14px;color:#4B4751;margin:0 0 28px;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
            Please complete your assessment within <strong>14 days</strong> of your original invitation.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td style="background:#F5741A;border-radius:999px;padding:14px 28px;">
            <a href="${signupUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">Continue Assessment</a>
          </td></tr></table>
          <p style="font-size:14px;color:#4B4751;margin:0;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">Best regards,<br/><strong>The BrainWise Team</strong></p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #EDEAE0;text-align:center;">
          <p style="font-size:12px;color:#6D6875;margin:0;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">© ${new Date().getFullYear()} BrainWise Enterprises. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: client.client_email,
          subject: "Friendly Reminder: Your BrainWise Assessment is Waiting",
          html,
        },
      });
      if (error) {
        console.error("[CoachClients] remind send-email error:", error);
        toast.warning("Failed to send reminder email.");
      } else {
        toast.success(`Reminder sent to ${client.client_email}`);
      }
    } catch (err) {
      console.error("[CoachClients] remind exception:", err);
      toast.warning("Failed to send reminder email.");
    } finally {
      setSendingReminderId(null);
    }
  };

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your coaching clients and assessments</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="gap-2"
              disabled={certsLoaded && allowedInstrumentIds.size === 0}
              title={certsLoaded && allowedInstrumentIds.size === 0
                ? "You need an active certification to order assessments"
                : undefined}
            >
              <Plus className="h-4 w-4" /> Order Assessment <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { resetForm(); setModalOpen(true); }}>
              Single client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBulkModalOpen(true)}>
              Bulk invite
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShareableModalOpen(true)}>
              Generate shareable link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Order Assessment</DialogTitle>
              <DialogDescription>Set up an assessment for a new or existing client</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="coach-pays" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="coach-pays">I'll Pay for My Client</TabsTrigger>
                <TabsTrigger value="client-pays">Client Pays Themselves</TabsTrigger>
              </TabsList>

              {/* Shared form fields */}
              <div className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">First Name</Label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Last Name</Label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Client Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Personal Note <span className="text-muted-foreground">(optional)</span></Label>
                  <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="A brief message to your client..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Assessment Instruments <span className="text-muted-foreground">(select at least one)</span></Label>
                  <div className={`space-y-2 rounded-md border p-3 ${instrumentError ? "border-destructive" : "border-border"}`}>
                    {INSTRUMENTS.filter(inst => allowedInstrumentIds.has(inst.id)).map(inst => (
                      <label key={inst.id} className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={selectedInstruments.includes(inst.id)}
                          onCheckedChange={() => toggleInstrument(inst.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-sm">{inst.id}</span>
                          <span className="text-muted-foreground text-xs ml-2">— {inst.name}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{inst.desc}</p>
                        </div>
                      </label>
                    ))}
                    {certsLoaded && allowedInstrumentIds.size === 0 && (
                      <div className="rounded-md border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
                        You don't have any active certifications. Complete a certification path to start ordering assessments for clients.{" "}
                        <a href="/certifications" className="text-primary underline underline-offset-2">View certifications</a>
                      </div>
                    )}
                  </div>
                  {instrumentError && (
                    <p className="text-xs text-destructive">Please select at least one instrument.</p>
                  )}
                  {selectedInstruments.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedInstruments.length} instrument{selectedInstruments.length !== 1 ? "s" : ""} selected
                      {" "}— {perAssessmentPrice !== null
                        ? `$${(selectedInstruments.length * perAssessmentPrice).toFixed(2)} total`
                        : "loading price…"}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Allow client to see results immediately</Label>
                    <p className="text-xs text-muted-foreground">If off, client must wait for coach debrief before viewing results</p>
                  </div>
                  <Switch checked={resultsReleased} onCheckedChange={setResultsReleased} />
                </div>
              </div>

              <TabsContent value="coach-pays" className="mt-4">
                <Button className="w-full gap-2" onClick={handleOrderCoachPays} disabled={submitting || !email}>
                  <ClipboardCheck className="h-4 w-4" /> {submitting ? "Processing..." : "Proceed to Payment"}
                </Button>
              </TabsContent>

              <TabsContent value="client-pays" className="mt-4">
                <Button className="w-full gap-2" onClick={handleOrderClientPays} disabled={submitting || !email}>
                  <Send className="h-4 w-4" /> {submitting ? "Sending..." : "Send Invitation"}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <BulkInviteModal
          open={bulkModalOpen}
          onOpenChange={setBulkModalOpen}
          allowedInstrumentIds={allowedInstrumentIds}
          perAssessmentPrice={perAssessmentPrice}
          onComplete={() => { setBulkModalOpen(false); fetchClients(); }}
        />

        <ShareableLinkModal
          open={shareableModalOpen}
          onOpenChange={setShareableModalOpen}
          allowedInstrumentIds={allowedInstrumentIds}
          perAssessmentPrice={perAssessmentPrice}
          onComplete={() => { setShareableModalOpen(false); fetchClients(); }}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalUniqueClients}</p>
              <p className="text-xs text-muted-foreground">Total Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-accent/10 p-2"><ClipboardCheck className="h-5 w-5 text-accent" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Completed This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-destructive/10 p-2"><Clock className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pending}</p>
              <p className="text-xs text-muted-foreground">Assessments Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "clients" | "pending")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="pending">Pending Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <Users className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground">No clients yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get started by ordering an assessment for your first client.
              </p>
            </div>
            <Button className="gap-2" onClick={() => { resetForm(); setModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Order Your First Assessment
            </Button>
          </CardContent>
        </Card>
      ) : selectedClientEmail === null ? (
        /* Level 1 — Client List */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Roster</CardTitle>
            <CardDescription>
              {uniqueClients.length} client{uniqueClients.length !== 1 ? "s" : ""}
            </CardDescription>
            <div className="pt-2">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assessments</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueClients
                    .filter(uc => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (uc.client_name?.toLowerCase().includes(q) || uc.client_email.toLowerCase().includes(q));
                    })
                    .map(uc => (
                    <TableRow key={uc.client_email}>
                      <TableCell className="font-medium">
                        {uc.client_name || uc.client_email}
                      </TableCell>
                      <TableCell className="text-sm">{uc.client_email}</TableCell>
                      <TableCell className="text-sm">{uc.assessment_count}</TableCell>
                      <TableCell className="text-sm">{uc.completed_count}</TableCell>
                      <TableCell className="text-sm">{uc.pending_count}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => { setSelectedClientEmail(uc.client_email); setSearchQuery(""); }}
                        >
                          <Eye className="h-3 w-3" /> View Assessments
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Level 2 — Assessment Detail for selected client */
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedClientEmail(null)}>
                <ArrowLeft className="h-4 w-4" /> Back to Clients
              </Button>
            </div>
            <CardTitle className="text-lg">
              {clients.find(c => c.client_email === selectedClientEmail)?.client_name || selectedClientEmail}
            </CardTitle>
            <CardDescription>{selectedClientEmail}</CardDescription>
            <div className="pt-2">
              <Button
                size="sm"
                className="gap-1"
                disabled={certsLoaded && allowedInstrumentIds.size === 0}
                onClick={() => {
                  resetForm();
                  setEmail(selectedClientEmail);
                  setModalOpen(true);
                }}
                title={certsLoaded && allowedInstrumentIds.size === 0
                  ? "You need an active certification to order assessments"
                  : undefined}
              >
                <Plus className="h-3 w-3" /> Order Assessment for This Client
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Sent</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients
                    .filter(c => c.client_email === selectedClientEmail)
                    .map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{c.instrument_name || "—"}</TableCell>
                      <TableCell>{getStatusBadge(c.assessment_status, c.invitation_status)}</TableCell>
                      <TableCell className="text-sm">
                        {c.created_at ? format(new Date(c.created_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.completed_at ? format(new Date(c.completed_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {c.stripe_payment_intent_id ? (
                          <Badge variant="default" className="text-xs">Coach Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Self Pay</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={c.assessment_status !== "completed"}
                          onClick={() => navigate(`/coach/client-results?user_id=${c.client_user_id}&assessment_id=${c.assessment_id}`)}
                        >
                          <Eye className="h-3 w-3" /> Results
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          disabled={(c.invitation_status !== "sent" && c.invitation_status !== "opened") || sendingReminderId === c.id}
                          onClick={() => handleRemind(c)}
                        >
                          <Mail className="h-3 w-3" /> {sendingReminderId === c.id ? "Sending..." : "Remind"}
                        </Button>
                        {c.invitation_status === "completed" && c.assessment_status === "completed" && (
                          <Button
                            size="sm"
                            variant={c.debrief_completed ? "secondary" : "default"}
                            className="gap-1"
                            disabled={c.debrief_completed}
                            onClick={async () => {
                              const { error } = await supabase
                                .from("coach_clients")
                                .update({ debrief_completed: true })
                                .eq("id", c.id);
                              if (!error) fetchClients();
                            }}
                          >
                            {c.debrief_completed ? "Debrief Done" : "Mark Debrief Complete"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <PendingInvitations
            coachUserId={user?.id ?? null}
            onChanged={fetchClients}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
