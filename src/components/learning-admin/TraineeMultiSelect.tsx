import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Trainee {
  trainee_user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function TraineeMultiSelect({ selectedIds, onChange }: Props) {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["list_mentor_trainees"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_mentor_trainees" as never, {} as never);
      if (error) throw error;
      return data as { trainees: Trainee[] };
    },
  });

  const trainees: Trainee[] = data?.trainees ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trainees;
    return trainees.filter(
      (t) =>
        (t.full_name ?? "").toLowerCase().includes(q) ||
        (t.email ?? "").toLowerCase().includes(q),
    );
  }, [trainees, search]);

  const selectedSet = new Set(selectedIds);
  const selectedTrainees = trainees.filter((t) => selectedSet.has(t.trainee_user_id));

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  return (
    <div className="space-y-2">
      {selectedTrainees.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTrainees.map((t) => (
            <Badge key={t.trainee_user_id} variant="secondary" className="gap-1">
              {t.full_name || t.email || t.trainee_user_id}
              <button type="button" onClick={() => toggle(t.trainee_user_id)} aria-label="Remove">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
      )}
      <Input
        placeholder="Search trainees by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="border rounded-md max-h-60 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading trainees…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">No trainees found.</div>
        ) : (
          filtered.map((t) => (
            <label
              key={t.trainee_user_id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
            >
              <Checkbox
                checked={selectedSet.has(t.trainee_user_id)}
                onCheckedChange={() => toggle(t.trainee_user_id)}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.full_name || "(no name)"}</div>
                <div className="text-xs text-muted-foreground truncate">{t.email}</div>
              </div>
            </label>
          ))
        )}
      </div>
      <div className="text-xs text-muted-foreground">{selectedIds.length} selected</div>
    </div>
  );
}
