import { Brain } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex items-center gap-3">
        <Brain className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          BrainWise
        </h1>
      </div>
      <p className="mt-3 text-muted-foreground">Your intelligent companion</p>
    </div>
  );
};

export default Index;
