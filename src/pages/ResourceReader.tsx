import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useResourceAccessLog } from "@/hooks/useResourceAccessLog";
import UpgradeNudgeModal from "@/components/resources/UpgradeNudgeModal";
import type {
  GetUserResourcesResult,
  Resource,
  UpgradeEntityType,
} from "@/components/resources/types";

function detectVideoEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    // not a URL
  }
  return null;
}

export default function ResourceReader() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const logAccess = useResourceAccessLog();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["get_user_resources"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_resources" as never);
      if (error) throw error;
      return data as unknown as GetUserResourcesResult;
    },
  });

  const resource: Resource | null = useMemo(() => {
    if (!data || !resourceId) return null;
    for (const tab of data.tabs ?? []) {
      const found = (tab.resources ?? []).find((r) => r.resource_id === resourceId);
      if (found) return found;
    }
    return null;
  }, [data, resourceId]);

  useEffect(() => {
    if (resource && resource.is_accessible) {
      logAccess(resource.resource_id);
    }
  }, [resource, logAccess]);

  const downloadFile = async () => {
    if (!resource) return;
    setDownloading(true);
    const { data: result, error } = await supabase.functions.invoke(
      "get-resource-signed-url",
      { body: { p_resource_id: resource.resource_id } },
    );
    setDownloading(false);
    if (error || !result?.signed_url) {
      toast({
        title: "Could not download",
        description: result?.error || error?.message || "Content not available.",
        variant: "destructive",
      });
      return;
    }
    window.open(result.signed_url, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={() => navigate("/resources")}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Resources
        </Button>
        <Card className="mt-4">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Resource not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!resource.is_accessible) {
    const upgradeType: UpgradeEntityType = resource.content_type;
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={() => navigate("/resources")}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Resources
        </Button>
        <Card className="mt-4">
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              You don't have access to this resource.
            </p>
            <Button onClick={() => setUpgradeOpen(true)}>Upgrade</Button>
          </CardContent>
        </Card>
        <UpgradeNudgeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          entityType={upgradeType}
          entityName={resource.title}
        />
      </div>
    );
  }

  const publishedDate = resource.published_at
    ? new Date(resource.published_at).toLocaleDateString()
    : null;

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <Button variant="ghost" onClick={() => navigate("/resources")}>
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Resources
      </Button>

      <header className="mt-4 space-y-2">
        <h1 className="text-2xl font-semibold leading-tight">{resource.title}</h1>
        {resource.summary && (
          <p className="italic text-muted-foreground">{resource.summary}</p>
        )}
        {publishedDate && (
          <p className="text-xs text-muted-foreground">Published {publishedDate}</p>
        )}
      </header>

      <div className="mt-6">
        {resource.content_type === "article" || resource.content_type === "guide" ? (
          <article
            className="text-base leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6"
            dangerouslySetInnerHTML={{ __html: resource.url_or_content ?? "" }}
          />
        ) : resource.content_type === "video" ? (
          (() => {
            const url = resource.url_or_content ?? "";
            const embed = detectVideoEmbed(url);
            if (embed) {
              return (
                <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
                  <iframe
                    src={embed}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={resource.title}
                  />
                </div>
              );
            }
            return (
              <p className="text-sm">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Open video in a new tab
                </a>
              </p>
            );
          })()
        ) : (
          // worksheet / template fallback
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                This is a downloadable file.
              </p>
              <Button onClick={downloadFile} disabled={downloading}>
                {downloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing…
                  </>
                ) : (
                  "Download"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
