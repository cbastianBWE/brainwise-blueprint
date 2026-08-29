export type BdoItem = {
  id: string;
  title: string;
  status: string;
  origin: string;
  move_count: number;
  position: number;
};

export type BdoCarryover = {
  id: string;
  title: string;
  move_count: number;
  first_seen_date: string;
  from_date: string;
};

export type BdoBlock = {
  kind: "work" | "break";
  title: string;
  detail?: string | null;
  minutes?: number | null;
  item_id?: string | null;
  break_id?: string | null;
};

export type BdoPlanBody = {
  headline?: string | null;
  blocks?: BdoBlock[];
  note?: string | null;
};

export type BdoPlan = {
  id: string;
  plan_date: string;
  status: "interviewing" | "planned" | "closed";
  form: Record<string, unknown> | null;
  transcript: { role: string; content: string }[] | null;
  plan: BdoPlanBody | null;
  exchange_budget: number;
  exchanges_spent: number;
  generations_used: number;
  reshapes_used: number;
  reshape_allowance: number;
};

export type BdoStart =
  | { gated: true; reason?: string }
  | { gated: false; plan: BdoPlan; items: BdoItem[]; carryover: BdoCarryover[] };

export type FormField = {
  key: string;
  type: string;
  label?: string;
  help?: string;
  placeholder?: string;
  optional?: boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  low_label?: string;
  high_label?: string;
  options?: string[];
  actions?: string[];
};

export type FormSpec = { fields?: FormField[] };

/** Browser-local calendar date as YYYY-MM-DD. */
export function localDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA");
}

export function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDate(d);
}

export function moveCountNote(n: number): string | null {
  if (!n || n < 1) return null;
  if (n === 1) return "moved once";
  if (n === 2) return "moved twice";
  return `moved ${n} times`;
}
