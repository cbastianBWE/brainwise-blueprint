import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InterventionsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Intervention Tracking</h1>
        <p className="text-muted-foreground mt-1">
          View and manage interventions saved across all dashboards.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          The full Interventions page is being built. Routing and access control verified.
        </CardContent>
      </Card>
    </div>
  );
}
