import {
  Video, FileQuestion, PenLine, Users, Upload, ExternalLink, CalendarClock,
  Layers, Trophy, GraduationCap, BookOpenText,
} from "lucide-react";

export const CERT_INSTRUMENTS = [
  { id: "INST-001", label: "PTP" },
  { id: "INST-002", label: "NAI" },
  { id: "INST-003", label: "AIRSA" },
  { id: "INST-004", label: "HSS" },
];

export const CERTIFICATION_TYPES = [
  { value: "ptp_coach", label: "PTP Coach" },
  { value: "ai_transformation_coach", label: "AI Transformation Coach" },
  { value: "ai_transformation_ptp_coach", label: "AI Transformation + PTP Coach" },
  { value: "my_brainwise_coach", label: "My BrainWise Coach" },
];

export const DELIVERY_MODES = [
  { value: "self_paced", label: "Self-paced" },
  { value: "cohort",     label: "Cohort" },
];

export const CURRICULUM_MODES = [
  { value: "free_order",  label: "Free order" },
  { value: "sequential",  label: "Sequential" },
];

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export type NodeType = "cp" | "cu" | "mo" | "ci";

export interface TreeNode {
  type: NodeType;
  id: string;
  name: string;
  isPublished?: boolean;
  itemType?: string;
  children: TreeNode[];
}

export const TYPE_LABELS: Record<NodeType, string> = {
  cp: "Certification path",
  cu: "Curriculum",
  mo: "Module",
  ci: "Content item",
};

export function ItemTypeIcon({ itemType, className }: { itemType?: string; className?: string }) {
  const map: Record<string, typeof Video> = {
    video: Video,
    quiz: FileQuestion,
    written_summary: PenLine,
    skills_practice: Users,
    file_upload: Upload,
    external_link: ExternalLink,
    live_event: CalendarClock,
    lesson_blocks: Layers,
  };
  const Icon = (itemType && map[itemType]) || Layers;
  return <Icon className={className} />;
}

export function NodeTypeIcon({ node, className }: { node: TreeNode; className?: string }) {
  if (node.type === "cp") return <Trophy className={className} />;
  if (node.type === "cu") return <GraduationCap className={className} />;
  if (node.type === "mo") return <BookOpenText className={className} />;
  return <ItemTypeIcon itemType={node.itemType} className={className} />;
}

export const ITEM_TYPE_OPTIONS = [
  { value: "video", label: "Video" },
  { value: "quiz", label: "Quiz" },
  { value: "written_summary", label: "Written summary" },
  { value: "skills_practice", label: "Skills practice" },
  { value: "file_upload", label: "File upload" },
  { value: "external_link", label: "External link" },
  { value: "live_event", label: "Live event" },
  { value: "lesson_blocks", label: "Lesson blocks" },
];
