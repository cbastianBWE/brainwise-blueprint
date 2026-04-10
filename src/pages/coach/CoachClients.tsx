import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ASSESSMENT_PURCHASE } from "@/lib/stripe";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, ClipboardCheck, Clock, Plus, Send, Eye, Mail,
} from "lucide-react";
import { format } from "date-fns";

const INSTRUMENTS = [
  { id: "PTP", name: "Personal Threat Profile", desc: "Measures nonconscious threat responses influencing behavior." },
  { id: "NAI", name: "Neuroscience Adoption Index", desc: "Measures beliefs and threat responses related to AI adoption." },
  { id: "AIRSA", name: "AI Readiness Skills Assessment", desc: "Assesses readiness to adopt and leverage AI tools." },
  { id: "HSS", name: "Habit Stabilization Scorecard", desc: "Measures stability of behavioral changes related to AI." },
];

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
}

export default function CoachClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [instrument, setInstrument] = useState("PTP");
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);

    const { data: ccRows } = await supabase
      .from("coach_clients")
      .select("id, client_email, client_user_id, invitation_status, assessment_id, coach_notes, created_at")
      .eq("coach_user_id", user.id)
      .order("created_at", { ascending: false });

    if (!ccRows) { setLoading(false); return; }

    // Enrich with client names, assessment info, instrument names
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
          // Get instrument name
          const { data: inst } = await supabase
            .from("instruments")
            .select("instrument_name")
            .eq("instrument_id", a.instrument_id)
            .limit(1)
            .single();
          instrumentName = inst?.instrument_name || a.instrument_id;
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
      });
    }

    setClients(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  const resetForm = () => {
    setFirstName(""); setLastName(""); setEmail(""); setNote(""); setInstrument("PTP");
  };

  const handleOrderCoachPays = async () => {
    if (!user || !email) {
      toast.error("Please fill in client email.");
      return;
    }
    setSubmitting(true);
    try {
      // Look up the instrument UUID from the instruments table
      const { data: instRow, error: instError } = await supabase
        .from("instruments")
        .select("id")
        .eq("instrument_id", instrument)
        .limit(1)
        .single();
      if (instError || !instRow) throw new Error("Could not find instrument");

      // First create the coach_clients record
      const { error: insertError } = await supabase.from("coach_clients").insert({
        coach_user_id: user.id,
        client_email: email,
        invitation_status: "pending_payment",
        coach_notes: note || null,
      });
      if (insertError) throw insertError;

      // Then redirect to Stripe checkout for assessment purchase
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          price_id: ASSESSMENT_PURCHASE.price_id,
          mode: "coach_order",
          instrument_id: instRow.id,
          client_email: email,
          client_first_name: firstName,
          client_last_name: lastName,
          coach_note: note,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
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
    setSubmitting(true);

    const { error } = await supabase.from("coach_clients").insert({
      coach_user_id: user.id,
      client_email: email,
      invitation_status: "sent",
      coach_notes: note || null,
    });

    if (error) {
      toast.error("Failed to create client record: " + error.message);
      setSubmitting(false);
      return;
    }

    toast.success("Invitation created", {
      description: `An invitation for ${firstName} ${lastName} (${email}) has been recorded. Email delivery will be available once email integration is configured.`,
    });

    resetForm();
    setModalOpen(false);
    setSubmitting(false);
    fetchClients();
  };

  // Stats
  const totalClients = clients.length;
  const completedThisMonth = clients.filter(c => {
    if (!c.completed_at) return false;
    const d = new Date(c.completed_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const pending = clients.filter(c => c.assessment_status !== "completed").length;

  const getStatusBadge = (status: string | null, invitationStatus: string) => {
    if (!status) {
      if (invitationStatus === "sent") return <Badge variant="secondary">Invited</Badge>;
      return <Badge variant="outline">Pending</Badge>;
    }
    switch (status) {
      case "completed": return <Badge className="bg-accent text-accent-foreground">Completed</Badge>;
      case "in_progress": return <Badge variant="secondary">In Progress</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your coaching clients and assessments</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => { resetForm(); setModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Order Assessment for New Client
            </Button>
          </DialogTrigger>
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
                <div className="space-y-1">
                  <Label className="text-sm">Assessment Instrument</Label>
                  <Select value={instrument} onValueChange={setInstrument}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INSTRUMENTS.map(i => (
                        <SelectItem key={i.id} value={i.id}>
                          <span className="font-medium">{i.id}</span>
                          <span className="text-muted-foreground ml-2 text-xs">— {i.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {INSTRUMENTS.find(i => i.id === instrument)?.desc}
                  </p>
                </div>
              </div>

              <TabsContent value="coach-pays" className="mt-4">
                <Button className="w-full gap-2" onClick={handleOrderCoachPays} disabled={submitting || !email}>
                  <ClipboardCheck className="h-4 w-4" /> {submitting ? "Processing..." : "Proceed to Payment"}
                </Button>
              </TabsContent>

              <TabsContent value="client-pays" className="mt-4">
                <Button className="w-full gap-2" onClick={handleOrderClientPays} disabled={submitting}>
                  <Send className="h-4 w-4" /> {submitting ? "Sending..." : "Send Invitation"}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalClients}</p>
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

      {/* Client table */}
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Roster</CardTitle>
            <CardDescription>{clients.length} client{clients.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.client_name || <span className="text-muted-foreground italic">Pending</span>}
                      </TableCell>
                      <TableCell className="text-sm">{c.client_email}</TableCell>
                      <TableCell className="text-sm">{c.instrument_name || "—"}</TableCell>
                      <TableCell>{getStatusBadge(c.assessment_status, c.invitation_status)}</TableCell>
                      <TableCell className="text-sm">
                        {c.completed_at ? format(new Date(c.completed_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={c.assessment_status !== "completed"}
                          onClick={() => toast.info("Client results view coming soon.")}
                        >
                          <Eye className="h-3 w-3" /> Results
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          disabled={c.invitation_status !== "sent" && c.invitation_status !== "opened"}
                          onClick={() => toast.success("Reminder sent", { description: `Reminder sent to ${c.client_email}` })}
                        >
                          <Mail className="h-3 w-3" /> Remind
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
