import { useState } from "react";
import SharedResults from "@/pages/SharedResults";
import SharedWithMe from "@/pages/SharedWithMe";
import { cn } from "@/lib/utils";

type SharedView = "corp" | "general";

export default function SharedHub() {
  const [view, setView] = useState<SharedView>("corp");

  return (
    <div>
      <div className="flex gap-2 p-4 border-b">
        <button
          onClick={() => setView("corp")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            view === "corp" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          )}
        >
          Corp Shared Results
        </button>
        <button
          onClick={() => setView("general")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            view === "general" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          )}
        >
          Generally Shared
        </button>
      </div>
      <div>
        {view === "corp" ? <SharedResults /> : <SharedWithMe />}
      </div>
    </div>
  );
}
