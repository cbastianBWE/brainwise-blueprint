import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Row = {
  id: string;
  name: string;
  category: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  is_active: boolean;
};

const stripHtml = (html: string): string =>
  html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

export default function OperationsEmailTemplates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ops", "crmEmailTemplatesAdmin"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("crm_email_templates" as any)
        .select("id,name,category,subject,body_text,body_html,is_active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const reset = () => {
    setEditingId(null);
    setName(""); setCategory(""); setSubject(""); setBody("");
    setIsActive(true);
  };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setName(r.name ?? "");
    setCategory(r.category ?? "");
    setSubject(r.subject ?? "");
    setBody(r.body_text || stripHtml(r.body_html ?? ""));
    setIsActive(!!r.is_active);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const body_text = body;
    const body_html = `<div>${body.replace(/\n/g, "<br/>")}</div>`;
    const payload = {
      name: name.trim(),
      category: category.trim() || null,
      subject: subject.trim() || null,
      body_text,
      body_html,
      is_active: isActive,
    };
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await opsSupabase
          .from("crm_email_templates" as any)
          .update(payload)
          .eq("id", editingId);
        if (error) { toast.error(error.message); return; }
      } else {
        const { error } = await opsSupabase
          .from("crm_email_templates" as any)
          .insert(payload);
        if (error) { toast.error(error.message); return; }
      }
      toast.success(editingId ? "Template updated" : "Template created");
      qc.invalidateQueries({ queryKey: ["ops", "crmEmailTemplatesAdmin"] });
      setOpen(false); reset();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    const { error } = await opsSupabase
      .from("crm_email_templates" as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Template deleted");
    qc.invalidateQueries({ queryKey: ["ops", "crmEmailTemplatesAdmin"] });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Email templates</h1>
          <p className="text-muted-foreground text-sm">CRM · Reusable email templates</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />New template
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All templates</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No templates yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.category ?? "—"}</TableCell>
                    <TableCell>{r.subject ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit template" : "New template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
