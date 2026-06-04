import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatDate } from "@/pages/operations/_shared";

type PublicDoc = {
  document_type: "invoice" | "estimate";
  document: any;
  customer: { display_name: string };
  org: { name: string };
  lines: Array<{ description: string | null; quantity: number | null; unit_price: number | null; line_total: number | null }>;
};

export default function PublicEstimateRespond() {
  const { token = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<PublicDoc | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("ops_get_public_document_by_token" as any, { p_token: token });
        if (error || !data) {
          setInvalid(true);
          return;
        }
        const d = data as unknown as PublicDoc;
        if (!d || d.document_type !== "estimate") {
          setInvalid(true);
          return;
        }
        setDoc(d);
        setStatus((d.document.status ?? "").toLowerCase());
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleAccept() {
    setActing(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.rpc("ops_accept_estimate_by_token" as any, { p_token: token });
      if (error) { setErrorMsg(error.message ?? "Action failed"); return; }
      const r = data as any;
      if (r?.ok) {
        setResponded("accepted");
      } else {
        setErrorMsg(r?.error ?? "Action failed");
      }
    } finally {
      setActing(false);
    }
  }

  async function handleDecline() {
    setActing(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.rpc("ops_decline_estimate_by_token" as any, {
        p_token: token,
        p_reason: reason.trim() || null,
      });
      if (error) { setErrorMsg(error.message ?? "Action failed"); return; }
      const r = data as any;
      if (r?.ok) {
        setResponded("declined");
      } else {
        setErrorMsg(r?.error ?? "Action failed");
      }
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4">
      <h1 className="text-xl font-semibold tracking-tight mb-6">BrainWise</h1>
      <div className="w-full max-w-2xl">
        {loading ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Loading…</CardContent></Card>
        ) : invalid || !doc ? (
          <Card>
            <CardHeader><CardTitle>Link no longer valid</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This estimate link is no longer valid. Please contact the sender for an updated link.
            </CardContent>
          </Card>
        ) : (
          <EstimateContent
            doc={doc}
            status={status}
            responded={responded}
            showDecline={showDecline}
            reason={reason}
            setReason={setReason}
            acting={acting}
            errorMsg={errorMsg}
            onAccept={handleAccept}
            onDeclineClick={() => setShowDecline(true)}
            onDeclineConfirm={handleDecline}
          />
        )}
      </div>
    </div>
  );
}

function EstimateContent(props: {
  doc: PublicDoc;
  status: string;
  responded: "accepted" | "declined" | null;
  showDecline: boolean;
  reason: string;
  setReason: (v: string) => void;
  acting: boolean;
  errorMsg: string | null;
  onAccept: () => void;
  onDeclineClick: () => void;
  onDeclineConfirm: () => void;
}) {
  const { doc, status, responded, showDecline, reason, setReason, acting, errorMsg, onAccept, onDeclineClick, onDeclineConfirm } = props;
  const est = doc.document;
  const currency = est.currency_code;

  const effectiveStatus = responded ?? status;

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">{doc.org?.name}</p>
        <CardTitle>Estimate {est.number}</CardTitle>
        <p className="text-sm text-muted-foreground">
          For {doc.customer?.display_name} · Issued {formatDate(est.issue_date)}
          {est.expiration_date ? ` · Expires ${formatDate(est.expiration_date)}` : ""}
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Line total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc.lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell>{l.description ?? "—"}</TableCell>
                <TableCell className="text-right">{l.quantity ?? "—"}</TableCell>
                <TableCell className="text-right">{formatMoney(l.unit_price, currency)}</TableCell>
                <TableCell className="text-right">{formatMoney(l.line_total, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-6 ml-auto max-w-sm space-y-1 text-sm">
          <Row label="Subtotal" value={formatMoney(est.subtotal_amount, currency)} />
          <Row label="Tax" value={formatMoney(est.tax_amount, currency)} />
          <Row label="Total" value={formatMoney(est.total_amount, currency)} bold />
        </div>

        {(est.notes_to_customer || est.terms_and_conditions) && (
          <div className="mt-6 space-y-4 text-sm">
            {est.notes_to_customer && (
              <div>
                <p className="font-medium mb-1">Notes</p>
                <p className="text-muted-foreground whitespace-pre-line">{est.notes_to_customer}</p>
              </div>
            )}
            {est.terms_and_conditions && (
              <div>
                <p className="font-medium mb-1">Terms and conditions</p>
                <p className="text-muted-foreground whitespace-pre-line">{est.terms_and_conditions}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          {errorMsg && <p className="text-sm text-destructive mb-3">{errorMsg}</p>}

          {responded === "accepted" && (
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Accepted — thank you.</p>
          )}
          {responded === "declined" && (
            <p className="text-sm font-medium">Declined. Thank you for letting us know.</p>
          )}

          {!responded && (effectiveStatus === "sent" || effectiveStatus === "viewed") && (
            <div className="flex flex-col gap-3">
              {!showDecline ? (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onDeclineClick} disabled={acting}>Decline</Button>
                  <Button onClick={onAccept} disabled={acting}>{acting ? "Working…" : "Accept"}</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Optional reason</p>
                  <Textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Let us know why you're declining (optional)"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setReason("")} disabled={acting}>Clear</Button>
                    <Button onClick={onDeclineConfirm} disabled={acting}>
                      {acting ? "Working…" : "Confirm decline"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!responded && effectiveStatus === "accepted" && (
            <p className="text-sm text-muted-foreground">You have already accepted this estimate.</p>
          )}
          {!responded && effectiveStatus === "declined" && (
            <p className="text-sm text-muted-foreground">You have already declined this estimate.</p>
          )}
          {!responded && effectiveStatus === "invoiced" && (
            <p className="text-sm text-muted-foreground">This estimate has been converted to an invoice.</p>
          )}
          {!responded && effectiveStatus === "expired" && (
            <p className="text-sm text-muted-foreground">This estimate has expired.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
