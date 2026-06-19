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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import { FileUploadField } from "@/components/super-admin/FileUploadField";
import { extractTextFromTipTap, type TipTapDocJSON } from "../blockTypeMeta";

type BranchingNode = {
  client_id: string;
  body: TipTapDocJSON;
  node_image_asset_id: string | null;
  is_terminal: boolean;
  outcome_label: string | null;
};

type BranchingEdge = {
  client_id: string;
  from_node_id: string;
  to_node_id: string;
  choice_text: string;
};

interface BranchingScenarioValue {
  instructions: string | null;
  start_node_id: string | null;
  nodes: BranchingNode[];
  edges: BranchingEdge[];
  gating_required: boolean;
  [key: string]: unknown;
}

interface Props {
  value: BranchingScenarioValue;
  onConfigChange: (next: BranchingScenarioValue) => void;
  contentItemId: string;
}

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

const MIN_NODES = 2;
const MAX_NODES = 12;
const MAX_CHOICES = 4;
const CHOICE_MAXLEN = 200;
const OUTCOME_LABEL_MAXLEN = 120;

function nodeLabel(node: BranchingNode, index: number): string {
  const snippet = extractTextFromTipTap(node.body).slice(0, 40).trim();
  return snippet ? `Node ${index + 1}: ${snippet}` : `Node ${index + 1}`;
}

function SortableNodeCard({
  node,
  index,
  allNodes,
  edges,
  startNodeId,
  onNodeChange,
  onDelete,
  canDelete,
  onSetStart,
  onAddChoice,
  onChoiceChange,
  onChoiceDelete,
  contentItemId,
}: {
  node: BranchingNode;
  index: number;
  allNodes: BranchingNode[];
  edges: BranchingEdge[];
  startNodeId: string | null;
  onNodeChange: (next: BranchingNode) => void;
  onDelete: () => void;
  canDelete: boolean;
  onSetStart: () => void;
  onAddChoice: () => void;
  onChoiceChange: (edge: BranchingEdge) => void;
  onChoiceDelete: (edgeId: string) => void;
  contentItemId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.client_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isStart = startNodeId === node.client_id;
  const outgoing = edges.filter((e) => e.from_node_id === node.client_id);
  const otherNodes = allNodes.filter((n) => n.client_id !== node.client_id);

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-card">
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag node"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Node {index + 1}</span>
            {isStart ? (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                Start
              </span>
            ) : (
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onSetStart}>
                Set as start
              </Button>
            )}
            {node.is_terminal && (
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                Ending
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Image (optional)</Label>
            <FileUploadField
              assetKind="image"
              contentItemId={contentItemId ?? null}
              refField="image_asset"
              value={node.node_image_asset_id}
              onChange={(newAssetId) => onNodeChange({ ...node, node_image_asset_id: newAssetId })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Situation</Label>
            <RichTextEditor
              value={node.body ?? null}
              onChange={(next) => onNodeChange({ ...node, body: next })}
              placeholder="What the trainee reads at this point"
              compact
            />
          </div>

          <div className="flex items-start gap-2">
            <Switch
              checked={node.is_terminal}
              onCheckedChange={(checked) =>
                onNodeChange({
                  ...node,
                  is_terminal: checked === true,
                  outcome_label: checked === true ? node.outcome_label : null,
                })
              }
            />
            <div className="space-y-0.5">
              <Label className="text-xs">This is an ending</Label>
              <p className="text-[11px] text-muted-foreground">
                Reaching any ending completes the block. Endings have no choices.
              </p>
            </div>
          </div>

          {node.is_terminal ? (
            <div className="space-y-2">
              <Label className="text-xs">
                Outcome label (optional, max {OUTCOME_LABEL_MAXLEN} chars)
              </Label>
              <Input
                value={node.outcome_label ?? ""}
                onChange={(e) =>
                  onNodeChange({ ...node, outcome_label: e.target.value || null })
                }
                maxLength={OUTCOME_LABEL_MAXLEN}
                placeholder="e.g. Best outcome, Missed opportunity"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">Choices</Label>
              {outgoing.length === 0 && (
                <p className="text-[11px] text-amber-600">
                  A non-ending node with no choices acts as an ending at runtime. Add a choice or mark it an ending.
                </p>
              )}
              {outgoing.map((edge, ci) => (
                <div key={edge.client_id} className="space-y-2 rounded border bg-muted/20 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Choice {ci + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onChoiceDelete(edge.client_id)}
                      aria-label="Remove choice"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={edge.choice_text}
                    onChange={(e) =>
                      onChoiceChange({ ...edge, choice_text: e.target.value.slice(0, CHOICE_MAXLEN) })
                    }
                    maxLength={CHOICE_MAXLEN}
                    placeholder="What the trainee can choose"
                  />
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Goes to</Label>
                    <Select
                      value={edge.to_node_id || ""}
                      onValueChange={(v) => onChoiceChange({ ...edge, to_node_id: v })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select target node" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherNodes.map((n) => {
                          const i = allNodes.findIndex((x) => x.client_id === n.client_id);
                          return (
                            <SelectItem key={n.client_id} value={n.client_id}>
                              {nodeLabel(n, i)}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              {outgoing.length < MAX_CHOICES && otherNodes.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={onAddChoice}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add choice
                </Button>
              )}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label="Delete node"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function BranchingScenarioBlockForm({ value, onConfigChange, contentItemId }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const nodes = value.nodes ?? [];
  const edges = value.edges ?? [];
  const gatingRequired = value.gating_required === true;
  const startNodeId =
    value.start_node_id && nodes.some((n) => n.client_id === value.start_node_id)
      ? value.start_node_id
      : nodes[0]?.client_id ?? null;

  // Spread ...value FIRST so top-level style keys (background_color, padding) survive.
  const emit = (patch: Partial<BranchingScenarioValue>) =>
    onConfigChange({
      ...value,
      nodes,
      edges,
      start_node_id: startNodeId,
      gating_required: gatingRequired,
      ...patch,
    });

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = nodes.findIndex((n) => n.client_id === active.id);
    const to = nodes.findIndex((n) => n.client_id === over.id);
    if (from < 0 || to < 0) return;
    emit({ nodes: arrayMove(nodes, from, to) });
  };

  const handleNodeChange = (next: BranchingNode) => {
    const prevTerminal = nodes.find((n) => n.client_id === next.client_id)?.is_terminal === true;
    const prunedEdges =
      next.is_terminal && !prevTerminal
        ? edges.filter((ed) => ed.from_node_id !== next.client_id)
        : edges;
    emit({
      nodes: nodes.map((n) => (n.client_id === next.client_id ? next : n)),
      edges: prunedEdges,
    });
  };

  const handleDeleteNode = (clientId: string) => {
    if (nodes.length <= MIN_NODES) return;
    const remaining = nodes.filter((n) => n.client_id !== clientId);
    const nextStart = startNodeId === clientId ? remaining[0]?.client_id ?? null : startNodeId;
    emit({
      nodes: remaining,
      edges: edges.filter((ed) => ed.from_node_id !== clientId && ed.to_node_id !== clientId),
      start_node_id: nextStart,
    });
  };

  const handleAddNode = () => {
    if (nodes.length >= MAX_NODES) return;
    emit({
      nodes: [
        ...nodes,
        {
          client_id: crypto.randomUUID(),
          body: emptyDoc(),
          node_image_asset_id: null,
          is_terminal: false,
          outcome_label: null,
        },
      ],
    });
  };

  const handleSetStart = (clientId: string) => emit({ start_node_id: clientId });

  const handleAddChoice = (fromNodeId: string) => {
    const existing = edges.filter((ed) => ed.from_node_id === fromNodeId);
    if (existing.length >= MAX_CHOICES) return;
    const firstOther = nodes.find((n) => n.client_id !== fromNodeId);
    emit({
      edges: [
        ...edges,
        {
          client_id: crypto.randomUUID(),
          from_node_id: fromNodeId,
          to_node_id: firstOther?.client_id ?? "",
          choice_text: "",
        },
      ],
    });
  };

  const handleChoiceChange = (next: BranchingEdge) =>
    emit({ edges: edges.map((ed) => (ed.client_id === next.client_id ? next : ed)) });

  const handleChoiceDelete = (edgeId: string) =>
    emit({ edges: edges.filter((ed) => ed.client_id !== edgeId) });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Instructions (optional)</Label>
        <Input
          value={value.instructions ?? ""}
          onChange={(e) =>
            emit({ instructions: e.target.value.trim() === "" ? null : e.target.value })
          }
          placeholder="e.g. Choose how you would respond at each step"
        />
      </div>

      <div className="space-y-2">
        <Label>Start node</Label>
        <Select
          value={startNodeId ?? ""}
          onValueChange={(v) => handleSetStart(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select start node" />
          </SelectTrigger>
          <SelectContent>
            {nodes.map((n, i) => (
              <SelectItem key={n.client_id} value={n.client_id}>
                {nodeLabel(n, i)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Label>Nodes</Label>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={nodes.map((n) => n.client_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {nodes.map((node, idx) => (
              <SortableNodeCard
                key={node.client_id}
                node={node}
                index={idx}
                allNodes={nodes}
                edges={edges}
                startNodeId={startNodeId}
                onNodeChange={handleNodeChange}
                onDelete={() => handleDeleteNode(node.client_id)}
                canDelete={nodes.length > MIN_NODES}
                onSetStart={() => handleSetStart(node.client_id)}
                onAddChoice={() => handleAddChoice(node.client_id)}
                onChoiceChange={handleChoiceChange}
                onChoiceDelete={handleChoiceDelete}
                contentItemId={contentItemId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddNode}
        disabled={nodes.length >= MAX_NODES}
      >
        <Plus className="mr-1 h-3 w-3" />
        Add node
      </Button>

      {nodes.length >= MAX_NODES && (
        <p className="text-[11px] text-muted-foreground">Max {MAX_NODES} nodes.</p>
      )}
      {nodes.length <= MIN_NODES && (
        <p className="text-[11px] text-muted-foreground">Minimum {MIN_NODES} nodes required.</p>
      )}

      <div className="flex items-start gap-2 border-t pt-3">
        <Switch
          checked={gatingRequired}
          onCheckedChange={(checked) => emit({ gating_required: checked === true })}
        />
        <div className="space-y-0.5">
          <Label className="text-xs">Require completion before continuing</Label>
          <p className="text-[11px] text-muted-foreground">
            When on, trainees must reach an ending before the next Continue button is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
