import { Card, CardContent } from "@/components/ui/card";

export default function Features() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Features</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization's contract features and per-member overrides.
        </p>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading features...
        </CardContent>
      </Card>
    </div>
  );
}
