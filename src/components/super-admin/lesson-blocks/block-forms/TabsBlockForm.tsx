import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import type { TipTapDocJSON } from "../blockTypeMeta";

type Tab = { client_id: string; label: string; body: TipTapDocJSON };
type TabStyle = "underline" | "pills";

interface Props {
  value: {
    tabs: Tab[];
    default_tab: number;
    style: TabStyle;
  };
  onConfigChange: (next: Props["value"]) => void;
}

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

function SortableTab({
  tab,
  onChange,
  onDelete,
  canDelete,
}: {
  tab: Tab;
  onChange: (next: Tab) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tab.client_id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-background p-2">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag tab"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-2">
          <Input
            value={tab.label}
            onChange={(e) => onChange({ ...tab, label: e.target.value })}
            placeholder="Tab label"
            className="font-medium"
            maxLength={32}
          />
          <RichTextEditor
            value={tab.body}
            onChange={(next) => onChange({ ...tab, body: next })}
            placeholder="Tab content"
            compact
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Remove tab"
          disabled={!canDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TabsBlockForm({ value, onConfigChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const tabs = value.tabs ?? [];
  const defaultTab = Number.isInteger(value.default_tab) ? value.default_tab : 0;
  const tabStyle: TabStyle = value.style === "pills" ? "pills" : "underline";

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = tabs.findIndex((t) => t.client_id === active.id);
    const to = tabs.findIndex((t) => t.client_id === over.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(tabs, from, to);
    let newDefault = defaultTab;
    if (defaultTab === from) newDefault = to;
    else if (defaultTab > from && defaultTab <= to) newDefault = defaultTab - 1;
    else if (defaultTab < from && defaultTab >= to) newDefault = defaultTab + 1;
    onConfigChange({ ...value, tabs: reordered, default_tab: newDefault });
  };

  const handleTabChange = (next: Tab) => {
    onConfigChange({
      ...value,
      tabs: tabs.map((t) => (t.client_id === next.client_id ? next : t)),
    });
  };

  const handleDelete = (clientId: string) => {
    if (tabs.length <= 2) return;
    const idx = tabs.findIndex((t) => t.client_id === clientId);
    const next = tabs.filter((t) => t.client_id !== clientId);
    let newDefault = defaultTab;
    if (defaultTab === idx) newDefault = 0;
    else if (defaultTab > idx) newDefault = defaultTab - 1;
    onConfigChange({ ...value, tabs: next, default_tab: newDefault });
  };

  const handleAdd = () => {
    if (tabs.length >= 6) return;
    onConfigChange({
      ...value,
      tabs: [
        ...tabs,
        { client_id: crypto.randomUUID(), label: `Tab ${tabs.length + 1}`, body: emptyDoc() },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Tab style</Label>
        <RadioGroup
          value={tabStyle}
          onValueChange={(v) => onConfigChange({ ...value, style: v as TabStyle })}
          className="grid grid-cols-2 gap-2"
        >
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs">
            <RadioGroupItem value="underline" />
            Underline (default)
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs">
            <RadioGroupItem value="pills" />
            Pills
          </Label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Default open tab</Label>
        <Select
          value={String(defaultTab)}
          onValueChange={(v) => onConfigChange({ ...value, default_tab: Number(v) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((t, idx) => (
              <SelectItem key={t.client_id} value={String(idx)}>
                {t.label || `Tab ${idx + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Tabs</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map((t) => t.client_id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tabs.map((t) => (
                <SortableTab
                  key={t.client_id}
                  tab={t}
                  onChange={handleTabChange}
                  onDelete={() => handleDelete(t.client_id)}
                  canDelete={tabs.length > 2}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={tabs.length >= 6}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add tab
        </Button>
        {tabs.length >= 6 && (
          <p className="text-xs text-muted-foreground">
            Max 6 tabs — split into multiple blocks if needed.
          </p>
        )}
      </div>
    </div>
  );
}
