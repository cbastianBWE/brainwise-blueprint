import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Upload, X, Linkedin } from "lucide-react";
import {
  PD_ALLOWED_MIME,
  PD_BUCKET,
  PD_MAX_BYTES,
  PD_STATUS_LINE,
  pdMissingLabel,
  type PdState,
} from "@/lib/practitionerDirectory";

const PROSE = "prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground";

interface FormState {
  display_name: string;
  headline: string;
  bio: string;
  city: string;
  region: string;
  country: string;
  website_url: string;
  booking_url: string;
  linkedin_url: string;
  instagram_url: string;
  youtube_url: string;
  x_url: string;
  headshot_path: string;
}

const EMPTY_FORM: FormState = {
  display_name: "", headline: "", bio: "", city: "", region: "", country: "",
  website_url: "", booking_url: "", linkedin_url: "", instagram_url: "",
  youtube_url: "", x_url: "", headshot_path: "",
};

const ONE_LINER_PLACEHOLDERS = [
  "Who you work with",
  "What you did before coaching",
  "What clients come to you for",
  "How you work (optional)",
];

export function DirectoryListingCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: state, isLoading } = useQuery({
    queryKey: ["directory-state", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("pd_get_my_directory_state");
      if (error) throw error;
      return (data ?? null) as PdState | null;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["directory-state", user?.id] });

  const [consentBusy, setConsentBusy] = useState(false);
  const setConsent = async (listed: boolean) => {
    setConsentBusy(true);
    const { error } = await (supabase.rpc as any)("pd_set_my_listing_consent", { p_listed: listed });
    setConsentBusy(false);
    if (error) {
      toast({ title: "Could not save your choice", description: error.message, variant: "destructive" });
      return;
    }
    await invalidate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Directory Listing</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!state) return null;

  return (
    <Card>
      <CardHeader><CardTitle>Directory Listing</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!state.is_certified ? (
          <p className="text-sm text-muted-foreground">
            The BrainWise practitioner directory becomes available once your certification is complete.
          </p>
        ) : !state.has_decided ? (
          <div className="space-y-4">
            {state.notice?.body_markdown && (
              <div className={PROSE}>
                <ReactMarkdown>{state.notice.body_markdown}</ReactMarkdown>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" disabled={consentBusy} onClick={() => setConsent(true)}>
                Yes, list me in the directory
              </Button>
              <Button variant="outline" disabled={consentBusy} onClick={() => setConsent(false)}>
                No, do not list me
              </Button>
            </div>
          </div>
        ) : state.consent?.listed === false ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You are not listed in the practitioner directory. This has no effect on your certification or your account.
            </p>
            <Button variant="link" className="px-0" disabled={consentBusy} onClick={() => setConsent(true)}>
              Change this
            </Button>
          </div>
        ) : (
          <DirectoryForm state={state} onSaved={invalidate} onOptOut={() => setConsent(false)} optOutBusy={consentBusy} />
        )}
      </CardContent>
    </Card>
  );
}

function DirectoryForm({
  state,
  onSaved,
  onOptOut,
  optOutBusy,
}: {
  state: PdState;
  onSaved: () => Promise<void> | void;
  onOptOut: () => void;
  optOutBusy: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const p = state.profile;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setForm({
      display_name: p?.display_name ?? "",
      headline: p?.headline ?? "",
      bio: p?.bio ?? "",
      city: p?.city ?? "",
      region: p?.region ?? "",
      country: p?.country ?? "",
      website_url: p?.website_url ?? "",
      booking_url: p?.booking_url ?? "",
      linkedin_url: p?.linkedin_url ?? "",
      instagram_url: p?.instagram_url ?? "",
      youtube_url: p?.youtube_url ?? "",
      x_url: p?.x_url ?? "",
      headshot_path: p?.headshot_path ?? "",
    });
  }, [p]);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const status = p?.moderation_status ?? "draft";
  const statusLine = PD_STATUS_LINE[status] ?? PD_STATUS_LINE.draft;
  const required = new Set(state.missing_fields);
  const isRequired = (field: string) => required.has(field);

  // ---- headshot ----
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [hasLinkedIn, setHasLinkedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUserIdentities();
      if (!active) return;
      setHasLinkedIn(!!data?.identities?.some((i) => i.provider === "linkedin_oidc"));
    })();
    return () => { active = false; };
  }, []);

  const headshotUrl = form.headshot_path
    ? supabase.storage.from(PD_BUCKET).getPublicUrl(form.headshot_path).data.publicUrl
    : null;

  const onPickFile = async (file: File | undefined) => {
    if (!file || !user) return;
    if (!PD_ALLOWED_MIME.includes(file.type)) {
      toast({ title: "Unsupported file", description: "Use JPEG, PNG, WebP, or AVIF.", variant: "destructive" });
      return;
    }
    if (file.size > PD_MAX_BYTES) {
      toast({ title: "File too large", description: "Max 10 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/headshot-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(PD_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    set("headshot_path", path);
    toast({ title: "Photo uploaded", description: "Save to submit it." });
  };

  const connectLinkedIn = async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: "linkedin_oidc" as any,
      options: { redirectTo: `${window.location.origin}/coach/profile?linkedin=connected` },
    });
    if (error) toast({ title: "Could not connect LinkedIn", description: error.message, variant: "destructive" });
  };

  // After returning from LinkedIn, prefill the display name if it is still empty.
  const [nameFromLinkedIn, setNameFromLinkedIn] = useState(false);
  const linkedInReturnHandled = useRef(false);

  useEffect(() => {
    if (linkedInReturnHandled.current) return;
    if (new URLSearchParams(window.location.search).get("linkedin") !== "connected") return;
    linkedInReturnHandled.current = true;
    (async () => {
      const { data } = await supabase.auth.getUserIdentities();
      const li = data?.identities?.find((i) => i.provider === "linkedin_oidc");
      const name = (li?.identity_data as { name?: string } | undefined)?.name?.trim();
      if (!name) return;
      if ((p?.display_name ?? "").trim()) return;
      set("display_name", name);
      setNameFromLinkedIn(true);
    })();
  }, [p?.display_name]);



  const importHeadshot = async () => {
    setImporting(true);
    const { data, error } = await supabase.functions.invoke("import-linkedin-headshot");
    setImporting(false);
    const payload = data as { success?: boolean; headshot_path?: string; message?: string } | null;
    if (error || !payload?.success) {
      let msg = payload?.message ?? error?.message ?? "Import failed.";
      if (error && (error as any).context?.text) {
        try {
          const body = await (error as any).context.text();
          const parsed = JSON.parse(body);
          if (parsed?.message) msg = parsed.message;
        } catch { /* keep msg */ }
      }
      toast({ title: "Could not import photo", description: msg, variant: "destructive" });
      return;
    }
    set("headshot_path", payload.headshot_path ?? "");
    toast({ title: "Photo imported", description: "Save to submit it." });
    await onSaved();
  };

  // ---- bio generator ----
  const [oneLiners, setOneLiners] = useState<string[]>(["", "", ""]);
  const [linkedinAbout, setLinkedinAbout] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genNotes, setGenNotes] = useState<string[]>([]);
  const [genDisclaimer, setGenDisclaimer] = useState<string | null>(null);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [genBlocked, setGenBlocked] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const location = useMemo(
    () => [form.city, form.region, form.country].filter(Boolean).join(", "),
    [form.city, form.region, form.country],
  );

  const hasGenInput =
    oneLiners.some((l) => l.trim().length > 0) || linkedinAbout.trim().length > 0;

  const generateBio = async () => {
    const liners = oneLiners.map((l) => l.trim()).filter(Boolean);
    const about = linkedinAbout.trim();
    if (liners.length === 0 && !about) {
      toast({ title: "Add something to work from", description: "Type at least one one-liner, or paste your LinkedIn About section.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setGenError(null);
    const { data, error } = await supabase.functions.invoke("generate-practitioner-bio", {
      body: {
        one_liners: liners,
        linkedin_about: about || undefined,
        display_name: form.display_name || undefined,
        headline: form.headline || undefined,
        location: location || undefined,
        linkedin_url: form.linkedin_url || undefined,
        existing_bio: form.bio ? form.bio : undefined,
      },
    });
    setGenerating(false);
    if (error) {
      let msg = error.message;
      let status: number | undefined;
      const ctx = (error as any).context;
      if (ctx) {
        status = ctx.status;
        try {
          const parsed = JSON.parse(await ctx.text());
          if (parsed?.error) msg = parsed.error;
          if (parsed?.remaining === 0) setGenBlocked(true);
        } catch { /* keep msg */ }
      }
      if (status === 429) setGenBlocked(true);
      setGenError(msg);
      return;
    }
    const res = data as { bio?: string; notes?: string[]; remaining_today?: number; disclaimer?: string };
    if (res?.bio) set("bio", res.bio);
    setGenNotes(res?.notes ?? []);
    setGenDisclaimer(res?.disclaimer ?? null);
    if (typeof res?.remaining_today === "number") {
      setRemainingToday(res.remaining_today);
      if (res.remaining_today <= 0) setGenBlocked(true);
    }
  };

  // ---- save ----
  const save = async () => {
    setSaving(true);
    const { error } = await (supabase.rpc as any)("pd_upsert_my_profile", {
      p_display_name: form.display_name,
      p_headline: form.headline,
      p_bio: form.bio,
      p_city: form.city,
      p_region: form.region,
      p_country: form.country,
      p_website_url: form.website_url,
      p_booking_url: form.booking_url,
      p_linkedin_url: form.linkedin_url,
      p_instagram_url: form.instagram_url,
      p_youtube_url: form.youtube_url,
      p_x_url: form.x_url,
      p_headshot_path: form.headshot_path,
      p_submit: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setDirty(false);
    await onSaved();
    toast({ title: "Saved" });
  };

  const field = (
    key: keyof FormState,
    label: string,
    opts: { requiredKey?: string; placeholder?: string } = {},
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pd-${key}`}>
        {label}
        {opts.requiredKey && isRequired(opts.requiredKey) && (
          <span className="ml-1 text-destructive">*</span>
        )}
      </Label>
      <Input
        id={`pd-${key}`}
        value={form[key]}
        placeholder={opts.placeholder}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-foreground">{statusLine}</p>
        {p?.review_note && (
          <p className="text-sm text-muted-foreground">Reviewer note: {p.review_note}</p>
        )}
        {state.missing_fields.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Still needed: {state.missing_fields.map(pdMissingLabel).join(", ")}.
          </p>
        )}
        {status === "approved" && dirty && (
          <div className="rounded-md border border-primary bg-primary/10 p-3 text-sm">
            Saving these edits sends your profile back for review. Your current listing stays live in the meantime.
          </div>
        )}
      </div>

      {/* Headshot */}
      <div className="space-y-2">
        <Label>
          Photo{isRequired("headshot") && <span className="ml-1 text-destructive">*</span>}
        </Label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full border bg-muted overflow-hidden flex items-center justify-center">
            {headshotUrl ? (
              <img src={headshotUrl} alt="Your directory headshot" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">No photo</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label>
              <input
                type="file"
                accept={PD_ALLOWED_MIME.join(",")}
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
              <Button asChild variant="outline" size="sm" disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload a photo
                </span>
              </Button>
            </label>
            {hasLinkedIn === false ? (
              <Button variant="outline" size="sm" onClick={connectLinkedIn}>
                <Linkedin className="h-4 w-4 mr-2" /> Connect LinkedIn
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={importHeadshot} disabled={importing || hasLinkedIn === null}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Linkedin className="h-4 w-4 mr-2" />}
                Import photo from LinkedIn
              </Button>
            )}
            {form.headshot_path && (
              <Button variant="ghost" size="sm" onClick={() => set("headshot_path", "")}>
                <X className="h-4 w-4 mr-2" /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {nameFromLinkedIn && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            We filled in your display name from your LinkedIn account. Edit it if you would rather show something else.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setNameFromLinkedIn(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {field("display_name", "Display name", { requiredKey: "display_name" })}
        {field("headline", "Headline", { placeholder: "Executive coach for first-time founders" })}
        {field("city", "City", { requiredKey: "city" })}
        {field("region", "State / region")}
        {field("country", "Country", { requiredKey: "country" })}
        {field("website_url", "Website URL")}
        {field("booking_url", "Booking URL")}
        {field("linkedin_url", "LinkedIn URL")}
        {field("instagram_url", "Instagram URL")}
        {field("youtube_url", "YouTube URL")}
        {field("x_url", "X URL")}
      </div>

      {/* Bio generator */}
      <div className="space-y-3 rounded-md border p-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Write your bio</h4>
          <p className="text-xs text-muted-foreground">
            Jot down a few one-liners about yourself and we will turn them into a first draft. This only uses what
            you type below — it does not read your LinkedIn profile.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pd-linkedin-about">Paste your LinkedIn About section (optional)</Label>
          <Textarea
            id="pd-linkedin-about"
            rows={6}
            value={linkedinAbout}
            onChange={(e) => setLinkedinAbout(e.target.value.slice(0, 5000))}
            placeholder="Paste the text of your LinkedIn About section here"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              If you have an About section on LinkedIn, paste it here and we will use the facts in it. We cannot read
              your profile ourselves.
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">{linkedinAbout.length}/5000</span>
          </div>
        </div>
        <div className="space-y-2">
          {oneLiners.map((val, i) => (
            <Input
              key={i}
              value={val}
              placeholder={ONE_LINER_PLACEHOLDERS[i] ?? "Another one-liner"}
              onChange={(e) =>
                setOneLiners((arr) => arr.map((v, idx) => (idx === i ? e.target.value : v)))
              }
            />
          ))}
          {oneLiners.length < 5 && (
            <Button variant="ghost" size="sm" onClick={() => setOneLiners((a) => [...a, ""])}>
              Add another one-liner
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={generateBio} disabled={generating || genBlocked || !hasGenInput}>

            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate a first draft from these notes
          </Button>
          {remainingToday !== null && (
            <span className="text-xs text-muted-foreground">{remainingToday} generations left today</span>
          )}
        </div>
        {genError && <p className="text-sm text-destructive">{genError}</p>}

        <div className="space-y-1.5">
          <Label htmlFor="pd-bio">
            Bio{isRequired("bio") && <span className="ml-1 text-destructive">*</span>}
          </Label>
          <Textarea
            id="pd-bio"
            rows={8}
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
          {genDisclaimer && <p className="text-xs text-muted-foreground">{genDisclaimer}</p>}
          {genNotes.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-0.5">
              {genNotes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save and submit for review
        </Button>
        <Button variant="ghost" onClick={onOptOut} disabled={optOutBusy}>
          Remove me from the directory
        </Button>
        {status === "approved" && <Badge variant="secondary">Live</Badge>}
      </div>
    </div>
  );
}

export default DirectoryListingCard;
