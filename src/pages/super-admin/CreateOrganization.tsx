import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function oneYearFromTodayISO() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function CreateOrganization() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [primaryContactEmail, setPrimaryContactEmail] = useState("");
  const [contractStartDate, setContractStartDate] = useState(todayISO());
  const [contractEndDate, setContractEndDate] = useState(oneYearFromTodayISO());
  const [licenseCount, setLicenseCount] = useState("10");
  const [dataRetentionMode, setDataRetentionMode] = useState<"standard" | "strict">("standard");
  const [aiChatEnabled, setAiChatEnabled] = useState(false);
  const [aiMonthlyAllowance, setAiMonthlyAllowance] = useState("");
  const [aiRegenAllowance, setAiRegenAllowance] = useState("");
  const [contractNotes, setContractNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isValid =
    name.trim().length > 0 &&
    primaryContactEmail.trim().length > 0 &&
    primaryContactEmail.includes("@") &&
    contractStartDate !== "" &&
    contractEndDate !== "" &&
    new Date(contractEndDate) >= new Date(contractStartDate) &&
    Number(licenseCount) >= 1;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);

    const { data, error } = await supabase.rpc("admin_create_organization", {
      p_name: name.trim(),
      p_primary_contact_email: primaryContactEmail.trim(),
      p_contract_start_date: contractStartDate,
      p_contract_end_date: contractEndDate,
      p_license_count: Number(licenseCount),
      p_ai_chat_enabled: aiChatEnabled,
      p_ai_monthly_message_allowance: aiChatEnabled
        ? (aiMonthlyAllowance === "" ? null : Number(aiMonthlyAllowance))
        : 0,
      p_ai_report_regeneration_allowance: aiChatEnabled
        ? (aiRegenAllowance === "" ? null : Number(aiRegenAllowance))
        : 0,
      p_data_retention_mode: dataRetentionMode,
      p_contract_notes: contractNotes.trim() || null,
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Could not create organization",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Organization created",
      description: `${name.trim()} is now active.`,
    });
    navigate(`/super-admin/company/${data}`);
  };

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create Organization</h1>
        <p className="text-sm text-muted-foreground">
          Provision a new corporate organization and its initial contract.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            New Organization
          </CardTitle>
          <CardDescription>
            Create a new corporate organization with its initial contract terms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Organization details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Organization details</h3>
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary-email">Primary Contact Email *</Label>
              <Input
                id="primary-email"
                type="email"
                value={primaryContactEmail}
                onChange={(e) => setPrimaryContactEmail(e.target.value)}
                placeholder="contact@acme.com"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Contract details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Contract details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Contract Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Contract End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license-count">License Count *</Label>
                <Input
                  id="license-count"
                  type="number"
                  min={1}
                  value={licenseCount}
                  onChange={(e) => setLicenseCount(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data-retention">Data Retention Mode</Label>
                <Select
                  value={dataRetentionMode}
                  onValueChange={(v) => setDataRetentionMode(v as "standard" | "strict")}
                  disabled={submitting}
                >
                  <SelectTrigger id="data-retention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (pseudonymized retention)</SelectItem>
                    <SelectItem value="strict">Strict (full deletion on departure)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* AI allowances */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">AI allowances</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-chat-enabled" className="cursor-pointer">Enable AI Chat</Label>
              <Switch
                id="ai-chat-enabled"
                checked={aiChatEnabled}
                onCheckedChange={setAiChatEnabled}
                disabled={submitting}
              />
            </div>
            {aiChatEnabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-monthly">AI Chat Monthly Message Allowance</Label>
                    <Input
                      id="ai-monthly"
                      type="number"
                      min={0}
                      value={aiMonthlyAllowance}
                      onChange={(e) => setAiMonthlyAllowance(e.target.value)}
                      disabled={submitting}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-regen">AI Report Regeneration Allowance</Label>
                    <Input
                      id="ai-regen"
                      type="number"
                      min={0}
                      value={aiRegenAllowance}
                      onChange={(e) => setAiRegenAllowance(e.target.value)}
                      disabled={submitting}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank for unlimited. Enter 0 to disable.
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Contract Notes (optional)</Label>
            <Textarea
              id="notes"
              value={contractNotes}
              onChange={(e) => setContractNotes(e.target.value)}
              disabled={submitting}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate("/super-admin/companies")}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Organization
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
