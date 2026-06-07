import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Trash2 } from "lucide-react";

type EntityType = "lead" | "account" | "contact" | "deal";

interface Props {
  entityType: EntityType;
  filters: Record<string, unknown>;
  onApply: (filters: Record<string, unknown>) => void;
}

export default function SavedViewsBar({ entityType, filters, onApply }: Props) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const { data: views = [] } = useQuery({
    queryKey: ["ops", "saved_lists", entityType],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("saved_lists" as any)
        .select("id, name, filters")
        .eq("entity_type", entityType)
        .order("position")
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const v = views.find((x: any) => x.id === id);
    if (v) onApply((v.filters as Record<string, unknown>) ?? {});
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error } = await opsSupabase
      .from("saved_lists" as any)
      .insert({ entity_type: entityType, name: trimmed, filters });
    if (error) {
      toast.error("Failed to save view");
      return;
    }
    toast.success("View saved");
    setName("");
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["ops", "saved_lists", entityType] });
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const { error } = await opsSupabase.from("saved_lists" as any).delete().eq("id", selectedId);
    if (error) {
      toast.error("Failed to delete view");
      return;
    }
    toast.success("View deleted");
    setSelectedId("");
    qc.invalidateQueries({ queryKey: ["ops", "saved_lists", entityType] });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={selectedId} onValueChange={handleSelect}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Saved views" />
        </SelectTrigger>
        <SelectContent>
          {views.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No saved views</div>
          ) : (
            views.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {selectedId && (
        <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete view">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      {saving ? (
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="View name"
            className="w-[180px] h-9"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setSaving(false); setName(""); }
            }}
          />
          <Button size="sm" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setSaving(false); setName(""); }}>Cancel</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setSaving(true)}>
          <Save className="h-4 w-4 mr-2" />Save view
        </Button>
      )}
    </div>
  );
}
