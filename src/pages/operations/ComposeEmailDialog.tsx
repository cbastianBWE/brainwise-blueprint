import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  relatedToType: "lead" | "account" | "contact" | "deal";
  relatedToId: string;
  defaultTo?: string;
  onSent?: () => void;
};

const NONE = "__none__";

const splitAddrs = (v: string): string[] =>
  v.split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 0);

const stripHtml = (html: string): string =>
  html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

export default function ComposeEmailDialog({
  open, onOpenChange, relatedToType, relatedToId, defaultTo, onSent,
}: Props) {
  const [to, setTo] = useState(defaultTo ?? "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [sending, setSending] = useState(false);

  const templatesQ = useQuery({
    queryKey: ["ops", "crmEmailTemplates"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("crm_email_templates" as any)
        .select("id,name,subject,body_html,body_text")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const reset = () => {
    setTo(defaultTo ?? ""); setCc(""); setBcc("");
    setSubject(""); setBody(""); setSelectedTemplateId("");
  };

  const onTemplateChange = (v: string) => {
    if (v === NONE) {
      setSelectedTemplateId("");
      return;
    }
    setSelectedTemplateId(v);
    const t = (templatesQ.data ?? []).find((x: any) => x.id === v);
    if (t) {
      setSubject(t.subject ?? "");
      setBody(t.body_text || stripHtml(t.body_html ?? ""));
    }
  };

  const handleSend = async () => {
    const to_addresses = splitAddrs(to);
    const cc_addresses = splitAddrs(cc);
    const bcc_addresses = splitAddrs(bcc);
    if (to_addresses.length + cc_addresses.length + bcc_addresses.length === 0) {
      toast.error("Add at least one recipient"); return;
    }
    if (!subject.trim()) { toast.error("Subject is required"); return; }

    const body_text = body;
    const body_html = `<div>${body.replace(/\n/g, "<br/>")}</div>`;

    setSending(true);
    try {
      const { data: prep, error: prepErr } = await supabase.rpc("ops_crm_email_prepare" as any, {
        p_payload: {
          to_addresses, cc_addresses, bcc_addresses,
          subject, body_html, body_text,
          send_type: "one_off", context: {},
        },
      });
      if (prepErr) { toast.error(prepErr.message); return; }
      const warn = (prep as any)?.marketing_warning_addresses as string[] | undefined;
      if (warn && warn.length) {
        if (!window.confirm(
          "These recipients opted out of marketing email: " + warn.join(", ") + ". Send anyway?"
        )) return;
      }

      const { data, error } = await supabase.functions.invoke("crm-email-send", {
        body: {
          to_addresses, cc_addresses, bcc_addresses,
          subject, body_html, body_text,
          send_type: "one_off", context: {},
          related_to_type: relatedToType,
          related_to_id: relatedToId,
          template_id: selectedTemplateId || null,
        },
      });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context.json()).error ?? msg; } catch {}
        toast.error(msg); return;
      }
      if ((data as any)?.success === false) {
        toast.error((data as any).error ?? "Send failed"); return;
      }
      toast.success("Email sent");
      onSent?.();
      reset();
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { /* keep state */ } onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compose email</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Template (optional)</Label>
            <Select value={selectedTemplateId || NONE} onValueChange={onTemplateChange}>
              <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {(templatesQ.data ?? []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="a@x.com, b@x.com" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cc</Label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bcc</Label>
              <Input value={bcc} onChange={(e) => setBcc(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending}>{sending ? "Sending…" : "Send"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
