import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ResourceTab {
  tab_id: string;
  slug: string;
  name: string;
  display_order: number;
  is_coach_only: boolean;
  is_learning_tree: boolean;
  // resources field is present in the RPC return but we don't render its contents in Group X.
}

interface GetUserResourcesResult {
  user_id: string;
  viewer_role: string;
  generated_at: string;
  tabs: ResourceTab[];
}

export default function Resources() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["get_user_resources"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_resources" as never);
      if (error) throw error;
      return data as unknown as GetUserResourcesResult;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="mb-4 text-2xl font-semibold">Resources</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">
              Failed to load resources: {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.tabs || data.tabs.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="mb-4 text-2xl font-semibold">Resources</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No resource tabs are available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [...data.tabs].sort((a, b) => a.display_order - b.display_order);
  const defaultTabSlug = tabs[0]?.slug ?? "";

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold">Resources</h1>

      <Tabs defaultValue={defaultTabSlug} className="w-full">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.slug} value={tab.slug}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.slug} value={tab.slug}>
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg font-medium text-muted-foreground">Coming soon</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The {tab.name.toLowerCase()} content will appear here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
