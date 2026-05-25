import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Pencil,
  Upload,
  UserCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNewsletterEditorContext } from "../../editor/NewsletterEditorContext";
import {
  uploadUserAsset,
  type UserUploadProgress,
} from "../../editor/uploadUserAsset";

interface AuthorBioData {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_asset_id: string | null;
  avatar_url: string | null;
}

interface CandidateAuthor {
  id: string;
  full_name: string | null;
  email: string;
}

function initialsFor(name: string | null, fallback: string): string {
  const src = (name && name.trim()) || fallback;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AuthorBioNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const { articleId } = useNewsletterEditorContext();
  const userId: string | null = node.attrs.user_id ?? null;

  // --- Candidate roster (mirrors AdminNewsletterArticle.tsx queryKey for dedup) ---
  const { data: candidates, isLoading: candidatesLoading } = useQuery<
    CandidateAuthor[]
  >({
    queryKey: ["newsletter-author-candidates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("account_type", "brainwise_super_admin")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: userId === null,
  });

  // --- Resolved author bio ---
  const [authorData, setAuthorData] = useState<AuthorBioData | null>(null);
  const [authorLoading, setAuthorLoading] = useState(false);
  const [authorError, setAuthorError] = useState<string | null>(null);

  const fetchAuthor = useCallback(async (uid: string) => {
    setAuthorLoading(true);
    setAuthorError(null);
    try {
      const { data, error } = await supabase.rpc(
        "get_newsletter_author_bio",
        { p_user_id: uid },
      );
      if (error) throw error;
      setAuthorData((data ?? null) as unknown as AuthorBioData | null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load author.";
      setAuthorError(msg);
      setAuthorData(null);
    } finally {
      setAuthorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setAuthorData(null);
      setAuthorError(null);
      return;
    }
    void fetchAuthor(userId);
  }, [userId, fetchAuthor]);

  // --- Bio edit mode ---
  const [bioEditMode, setBioEditMode] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [bioSaveError, setBioSaveError] = useState<string | null>(null);

  const openBioEdit = () => {
    setBioDraft(authorData?.bio ?? "");
    setBioSaveError(null);
    setBioEditMode(true);
  };
  const cancelBioEdit = () => {
    setBioDraft(authorData?.bio ?? "");
    setBioSaveError(null);
    setBioEditMode(false);
  };

  const saveBio = async () => {
    if (!userId) return;
    setIsSavingBio(true);
    setBioSaveError(null);
    try {
      const reason = `Edited via newsletter author bio block (article: ${
        articleId || "editor"
      })`;
      const { error } = await supabase.rpc("update_user_bio", {
        p_user_id: userId,
        p_bio: bioDraft,
        p_reason: reason,
      });
      if (error) throw error;
      setAuthorData((prev) => (prev ? { ...prev, bio: bioDraft } : prev));
      setBioEditMode(false);
    } catch (e) {
      setBioSaveError(e instanceof Error ? e.message : "Failed to save bio.");
    } finally {
      setIsSavingBio(false);
    }
  };

  // --- Avatar upload ---
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState<UserUploadProgress | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const triggerAvatarPicker = () => fileInputRef.current?.click();

  const handleAvatarFile = async (file: File) => {
    if (!userId) return;
    setAvatarError(null);
    setIsUploadingAvatar(true);
    setUploadProgress({ loaded: 0, total: file.size, pct: 0 });
    try {
      await uploadUserAsset({
        kind: "image",
        file,
        userId,
        refField: "avatar",
        onProgress: setUploadProgress,
      });
      await fetchAuthor(userId);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setIsUploadingAvatar(false);
      setUploadProgress(null);
    }
  };

  return (
    <NodeViewWrapper
      as="aside"
      data-newsletter-author-bio-view
      className={cn(
        "group/nl-author relative my-6 rounded-lg border bg-[var(--bw-sand,var(--bw-cream-200))] p-5 transition-shadow duration-150",
        selected
          ? "border-[#F5741A] ring-2 ring-[#F5741A]/40"
          : "border-[var(--border-1)] hover:border-[var(--border-2)]",
      )}
    >
      <button
        type="button"
        onClick={deleteNode}
        className="absolute right-2 top-2 z-10 rounded-full p-1 text-[var(--fg-3)] opacity-0 transition-opacity hover:bg-red-50 hover:text-[var(--danger)] group-hover/nl-author:opacity-100"
        aria-label="Delete author bio"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-3)]">
        Author bio
      </div>

      {userId === null && (
        <div>
          <div className="mb-2 text-xs text-[var(--fg-2)]">
            Select an author:
          </div>
          {candidatesLoading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--fg-3)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading authors…
            </div>
          ) : (candidates ?? []).length === 0 ? (
            <div className="text-xs italic text-[var(--fg-3)]">
              No candidate authors found.
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {(candidates ?? []).map((c) => {
                const label = c.full_name || c.email;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => updateAttributes({ user_id: c.id })}
                      className="flex w-full items-center gap-3 rounded-md border border-transparent bg-white/60 px-3 py-2 text-left transition-colors hover:border-[#F5741A] hover:bg-white"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bw-cream-300)] font-mono text-xs font-semibold text-[var(--fg-2)]">
                        {initialsFor(c.full_name, c.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[var(--fg-1)]">
                          {label}
                        </div>
                        {c.full_name && (
                          <div className="truncate text-[11px] text-[var(--fg-3)]">
                            {c.email}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {userId !== null && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] text-[var(--fg-3)]">
              user_id:{" "}
              <code className="font-mono">{userId.slice(0, 8)}…</code>
            </div>
            <button
              type="button"
              onClick={() => {
                updateAttributes({ user_id: null });
                setAuthorData(null);
                setBioEditMode(false);
              }}
              className="text-[11px] font-medium text-[#F5741A] underline-offset-2 hover:underline"
            >
              Change author
            </button>
          </div>

          {authorLoading && !authorData ? (
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-[var(--bw-cream-300)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--bw-cream-300)]" />
                <div className="h-3 w-full animate-pulse rounded bg-[var(--bw-cream-300)]" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--bw-cream-300)]" />
              </div>
            </div>
          ) : authorError ? (
            <div className="flex items-center gap-3 text-sm text-[var(--danger)]">
              <span>Could not load author. {authorError}</span>
              <button
                type="button"
                onClick={() => userId && fetchAuthor(userId)}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold text-[var(--fg-1)] hover:bg-[var(--bw-cream-200)]"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="group/avatar relative h-16 w-16 shrink-0">
                {authorData?.avatar_url ? (
                  <img
                    src={authorData.avatar_url}
                    alt={authorData.display_name ?? "Author avatar"}
                    className="h-16 w-16 rounded-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bw-cream-300)] font-mono text-lg font-semibold text-[var(--fg-2)]">
                    {authorData?.display_name ? (
                      initialsFor(authorData.display_name, "?")
                    ) : (
                      <UserCircle className="h-8 w-8 text-[var(--fg-3)]" />
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={triggerAvatarPicker}
                  disabled={isUploadingAvatar}
                  aria-label="Change avatar"
                  className={cn(
                    "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity",
                    isUploadingAvatar
                      ? "opacity-100"
                      : "opacity-0 group-hover/avatar:opacity-100",
                  )}
                >
                  {isUploadingAvatar ? (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploadProgress && (
                        <span className="text-[9px]">
                          {Math.round(uploadProgress.pct)}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="m-0 text-base font-semibold text-[var(--fg-1)]">
                  {authorData?.display_name || (
                    <span className="italic text-[var(--fg-3)]">
                      Unknown author
                    </span>
                  )}
                </h4>

                {bioEditMode ? (
                  <div className="mt-2">
                    <textarea
                      value={bioDraft}
                      onChange={(e) => setBioDraft(e.target.value)}
                      rows={5}
                      placeholder="Write a short author bio…"
                      className="w-full resize-y rounded-md border border-[var(--border-1)] bg-white px-3 py-2 text-sm text-[var(--fg-1)] focus:border-[#F5741A] focus:outline-none"
                    />
                    {bioSaveError && (
                      <div className="mt-1 text-xs text-[var(--danger)]">
                        {bioSaveError}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={saveBio}
                        disabled={isSavingBio}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F5741A] px-3 py-1 text-xs font-semibold text-white hover:bg-[#E06714] disabled:opacity-60"
                      >
                        {isSavingBio && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelBioEdit}
                        disabled={isSavingBio}
                        className="rounded-full px-3 py-1 text-xs font-medium text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-start gap-2">
                    <p
                      className={cn(
                        "m-0 flex-1 text-sm leading-relaxed",
                        authorData?.bio
                          ? "text-[var(--fg-2)]"
                          : "italic text-[var(--fg-4)]",
                      )}
                    >
                      {authorData?.bio || "Add a bio"}
                    </p>
                    <button
                      type="button"
                      onClick={openBioEdit}
                      aria-label="Edit bio"
                      className="shrink-0 rounded-full p-1 text-[var(--fg-3)] transition-colors hover:bg-white hover:text-[#F5741A]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {avatarError && (
                  <div className="mt-2 text-xs text-[var(--danger)]">
                    {avatarError}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleAvatarFile(file);
          e.target.value = "";
        }}
      />
    </NodeViewWrapper>
  );
}
