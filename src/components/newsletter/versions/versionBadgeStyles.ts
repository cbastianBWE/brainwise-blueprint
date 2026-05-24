import type { VersionType } from "./types";

export const VERSION_TYPE_BADGE: Record<VersionType, string> = {
  published: "bg-emerald-50 text-emerald-800 border-emerald-200",
  scheduled: "bg-teal-50 text-teal-800 border-teal-200",
  named_revision: "bg-violet-50 text-violet-800 border-violet-200",
  restored_from: "bg-amber-50 text-amber-800 border-amber-200",
  draft: "bg-slate-100 text-slate-500 border-slate-200",
};

export const VERSION_TYPE_LABEL: Record<VersionType, string> = {
  published: "Published",
  scheduled: "Scheduled",
  named_revision: "Named",
  restored_from: "Restored",
  draft: "Draft",
};
