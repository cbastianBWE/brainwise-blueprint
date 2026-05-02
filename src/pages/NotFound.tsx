import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bw-cream)] p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
          <img src="/brain-icon.png" alt="BrainWise" className="h-16 w-16" />
          <div className="space-y-2">
            <h1
              className="text-5xl font-bold"
              style={{ fontFamily: "'Poppins', sans-serif", color: "var(--bw-navy)" }}
            >
              404
            </h1>
            <p className="text-muted-foreground">
              We couldn't find the page you're looking for. It may have moved or no longer exists.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button asChild className="flex-1">
              <Link to="/">Return to Home</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/contact">Contact Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
