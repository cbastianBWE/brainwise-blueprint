import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";

const BUCKET = "practitioner-headshots";
const PLACEMENTS = ["about", "for_practitioners", "for_individuals", "home"] as const;

interface TeamRow {
  id: string;
  slug: string | null;
  display_name: string | null;
  credentials: string | null;
  role_title: string | null;
  headline: string | null;
  short_bio: string | null;
  bio: string | null;
  booking_url: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  headshot_bucket: string | null;
  headshot_path: string | null;
  sort_order: number | null;
  is_published: boolean | null;
}

interface TestimonialRow {
  id: string;
  quote: string | null;
  attribution_name: string | null;
  attribution_title: string | null;
  attribution_org: string | null;
  placements: string[] | null;
  headshot_bucket: string | null;
  headshot_path: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  is_published: boolean | null;
}

function publicUrl(bucket: string | null, path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket || BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `member-${Date.now()}`;
}

export default function AdminMarketing() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "testimonials" ? "testimonials" : "about";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Public About Us team members and reusable testimonials.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          next.set("tab", v);
          setParams(next, { replace: true });
        }}
      >
        <TabsList>
          <TabsTrigger value="about">About Us</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
        </TabsList>
        <TabsContent value="about" className="mt-6">
          <AboutTab />
        </TabsContent>
        <TabsContent value="testimonials" className="mt-6">
          <TestimonialsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------ headshot field ----------------------------- */

function HeadshotField({
  bucket,
  path,
  onChange,
}: {
  bucket: string | null;
  path: string | null;
  onChange: (path: string | null) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = publicUrl(bucket, path);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const key = `marketing/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      onChange(key);
      toast({ title: "Headshot uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>Headshot</Label>
      <div className="flex items-center gap-3">
        {url ? (
          <img
            src={url}
            alt=""
            className="h-16 w-16 rounded-md object-cover"
            style={{ objectPosition: "center top" }}
          />
        ) : (
          <div className="h-16 w-16 rounded-md bg-muted" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
        </Button>
        {path && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>
      {path && <p className="text-xs text-muted-foreground break-all">{path}</p>}
    </div>
  );
}

function useDeleteDialog(table: string, onDone: () => void) {
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const dialog = (
    <AlertDialog open={Boolean(pending)} onOpenChange={(o) => !o && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this row?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the record. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const id = pending;
              setPending(null);
              if (!id) return;
              const { error } = await (supabase.from as any)(table).delete().eq("id", id);
              if (error) {
                toast({ title: "Delete failed", description: error.message, variant: "destructive" });
                return;
              }
              toast({ title: "Deleted" });
              onDone();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { dialog, requestDelete: setPending };
}

/* -------------------------------- About tab -------------------------------- */

function AboutTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["mk-admin-team"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("marketing_team_members")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as TeamRow[];
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["mk-admin-team"] });
  const { dialog, requestDelete } = useDeleteDialog("marketing_team_members", invalidate);

  const create = async () => {
    const { error } = await (supabase.from as any)("marketing_team_members").insert({
      display_name: "New team member",
      slug: `member-${Date.now()}`,
      sort_order: (data?.length ?? 0) + 1,
      is_published: false,
    });
    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
      return;
    }
    invalidate();
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={create}>
          <Plus className="h-4 w-4 mr-1" /> Add team member
        </Button>
      </div>
      {(data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">No team members yet.</p>
      )}
      {(data ?? []).map((row) => (
        <TeamCard key={row.id} row={row} onSaved={invalidate} onDelete={() => requestDelete(row.id)} />
      ))}
      {dialog}
    </div>
  );
}

function TeamCard({ row, onSaved, onDelete }: { row: TeamRow; onSaved: () => void; onDelete: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<TeamRow>(row);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(row), [row]);

  const set = (k: keyof TeamRow, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase.from as any)("marketing_team_members")
      .update({
        display_name: form.display_name,
        slug: form.slug || slugify(form.display_name ?? ""),
        credentials: form.credentials || null,
        role_title: form.role_title || null,
        headline: form.headline || null,
        short_bio: form.short_bio || null,
        bio: form.bio || null,
        booking_url: form.booking_url || null,
        website_url: form.website_url || null,
        linkedin_url: form.linkedin_url || null,
        headshot_path: form.headshot_path || null,
        sort_order: Number(form.sort_order ?? 0),
        is_published: Boolean(form.is_published),
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    onSaved();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">
          {form.display_name || "Untitled"}{" "}
          <Badge variant={form.is_published ? "default" : "outline"} className="ml-2">
            {form.is_published ? "Published" : "Draft"}
          </Badge>
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={form.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Credentials</Label>
            <Input value={form.credentials ?? ""} onChange={(e) => set("credentials", e.target.value)} placeholder="MSIOP" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Role title</Label>
            <Input value={form.role_title ?? ""} onChange={(e) => set("role_title", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Headline</Label>
            <Input value={form.headline ?? ""} onChange={(e) => set("headline", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Short bio</Label>
            <Textarea rows={3} value={form.short_bio ?? ""} onChange={(e) => set("short_bio", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Bio (plain text, blank lines separate paragraphs)</Label>
            <Textarea rows={14} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Booking URL</Label>
            <Input value={form.booking_url ?? ""} onChange={(e) => set("booking_url", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Website URL</Label>
            <Input value={form.website_url ?? ""} onChange={(e) => set("website_url", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>LinkedIn URL</Label>
            <Input value={form.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={form.sort_order ?? 0}
              onChange={(e) => set("sort_order", e.target.value === "" ? 0 : Number(e.target.value))}
            />
          </div>
        </div>

        <HeadshotField
          bucket={form.headshot_bucket}
          path={form.headshot_path}
          onChange={(p) => set("headshot_path", p)}
        />

        <div className="flex items-center gap-2">
          <Checkbox
            id={`pub-${row.id}`}
            checked={Boolean(form.is_published)}
            onCheckedChange={(c) => set("is_published", Boolean(c))}
          />
          <Label htmlFor={`pub-${row.id}`}>Published</Label>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

/* ----------------------------- Testimonials tab ---------------------------- */

function TestimonialsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["mk-admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("marketing_testimonials")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as TestimonialRow[];
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["mk-admin-testimonials"] });
  const { dialog, requestDelete } = useDeleteDialog("marketing_testimonials", invalidate);

  const create = async () => {
    const { error } = await (supabase.from as any)("marketing_testimonials").insert({
      quote: "New testimonial",
      attribution_name: "Name",
      sort_order: (data?.length ?? 0) + 1,
      is_published: false,
    });
    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
      return;
    }
    invalidate();
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={create}>
          <Plus className="h-4 w-4 mr-1" /> Add testimonial
        </Button>
      </div>
      {(data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">No testimonials yet.</p>
      )}
      {(data ?? []).map((row) => (
        <TestimonialCard key={row.id} row={row} onSaved={invalidate} onDelete={() => requestDelete(row.id)} />
      ))}
      {dialog}
    </div>
  );
}

function TestimonialCard({
  row,
  onSaved,
  onDelete,
}: {
  row: TestimonialRow;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<TestimonialRow>(row);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(row), [row]);

  const set = (k: keyof TestimonialRow, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const placements = form.placements ?? [];

  const togglePlacement = (p: string, on: boolean) =>
    set("placements", on ? [...placements, p] : placements.filter((x) => x !== p));

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase.from as any)("marketing_testimonials")
      .update({
        quote: form.quote,
        attribution_name: form.attribution_name,
        attribution_title: form.attribution_title || null,
        attribution_org: form.attribution_org || null,
        placements,
        headshot_path: form.headshot_path || null,
        is_featured: Boolean(form.is_featured),
        sort_order: Number(form.sort_order ?? 0),
        is_published: Boolean(form.is_published),
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    onSaved();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">
          {form.attribution_name || "Untitled"}{" "}
          <Badge variant={form.is_published ? "default" : "outline"} className="ml-2">
            {form.is_published ? "Published" : "Draft"}
          </Badge>
          {form.is_featured && <Badge variant="secondary" className="ml-2">Featured</Badge>}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Quote</Label>
          <Textarea rows={5} value={form.quote ?? ""} onChange={(e) => set("quote", e.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Attribution name</Label>
            <Input value={form.attribution_name ?? ""} onChange={(e) => set("attribution_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={form.attribution_title ?? ""} onChange={(e) => set("attribution_title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Organization</Label>
            <Input value={form.attribution_org ?? ""} onChange={(e) => set("attribution_org", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Placements</Label>
          <div className="flex flex-wrap gap-4">
            {PLACEMENTS.map((p) => (
              <div key={p} className="flex items-center gap-2">
                <Checkbox
                  id={`${row.id}-${p}`}
                  checked={placements.includes(p)}
                  onCheckedChange={(c) => togglePlacement(p, Boolean(c))}
                />
                <Label htmlFor={`${row.id}-${p}`} className="font-normal">{p}</Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Leaving all of these unchecked makes the testimonial eligible on every page that shows
            testimonials.
          </p>
        </div>

        <HeadshotField
          bucket={form.headshot_bucket}
          path={form.headshot_path}
          onChange={(p) => set("headshot_path", p)}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={form.sort_order ?? 0}
              onChange={(e) => set("sort_order", e.target.value === "" ? 0 : Number(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id={`feat-${row.id}`}
              checked={Boolean(form.is_featured)}
              onCheckedChange={(c) => set("is_featured", Boolean(c))}
            />
            <Label htmlFor={`feat-${row.id}`}>Featured</Label>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id={`tpub-${row.id}`}
              checked={Boolean(form.is_published)}
              onCheckedChange={(c) => set("is_published", Boolean(c))}
            />
            <Label htmlFor={`tpub-${row.id}`}>Published</Label>
          </div>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
