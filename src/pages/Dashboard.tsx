import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to your Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You're logged in as {user?.email}. Your dashboard content will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
