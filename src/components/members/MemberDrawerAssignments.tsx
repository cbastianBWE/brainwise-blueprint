import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import JustifiedActionDialog, {
  type JustifiedActionResult,
} from "@/components/justified-action/JustifiedActionDialog";

interface Props {
  userId: string;
  fullName: string | null;
  setHasUnsavedChanges: (v: boolean) => void;
}

interface LauncherProps {
  userId: string;
  fullName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BulkRpcResult = {
  succeeded?: number;
  failed?: number;
  results?: Array<{ status?: string; detail?: string }>;
};

function toDueIso(dueDate: string): string | null {
  if (!dueDate) return null;
  return new Date(dueDate + "T00:00:00Z").toISOString();
}

function firstFailureMessage(result: BulkRpcResult, fallback: string): string {
  const f = result.results?.find(
    (r) => r.status !== "success" && r.status !== "ok",
  );
  return f?.detail ?? f?.status ?? fallback;
}

// ---------------- Cert path launcher ----------------
function AssignCertPathLauncher({ userId, fullName, open, onOpenChange }: LauncherProps) {
  const queryClient = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const optionsQuery = useQuery({
    queryKey: ["certification-paths-list"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certification_paths")
        .select("id, name")
        .is("archived_at", null)
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  useEffect(() => {
    if (!open) {
      setTargetId("");
      setDueDate("");
    }
  }, [open]);

  const handleSubmit = async (reason: string): Promise<JustifiedActionResult> => {
    if (!targetId) throw new Error("target_required");
    const { data, error } = await supabase.rpc(
      "enroll_users_in_certification_path_bulk" as any,
      {
        p_user_ids: [userId],
        p_certification_path_id: targetId,
        p_reason: reason,
        p_due_at: toDueIso(dueDate),
      } as any,
    );
    if (error) throw error;
    const result = (data ?? {}) as BulkRpcResult;
    await queryClient.invalidateQueries({ queryKey: ["members-search"] });
    await queryClient.invalidateQueries({ queryKey: ["get_user_learning_state", userId] });
    await queryClient.invalidateQueries({ queryKey: ["list_all_learning_assignments"] });
    if ((result.failed ?? 0) > 0) {
      throw new Error(firstFailureMessage(result, "Assignment failed."));
    }
    return { changed: (result.succeeded ?? 0) > 0 };
  };

  return (
    <JustifiedActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assign certification path"
      description={
        <span className="space-y-3 block">
          <span className="block">
            You are about to assign a certification path to{" "}
            <strong>{fullName ?? "this user"}</strong>.
          </span>
          <span className="block space-y-1.5">
            <Label htmlFor="assign-cert-path-target">Certification path</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger id="assign-cert-path-target">
                <SelectValue placeholder={optionsQuery.isLoading ? "Loading…" : "Select a certification path"} />
              </SelectTrigger>
              <SelectContent>
                {(optionsQuery.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
          <span className="block space-y-1.5">
            <Label htmlFor="assign-cert-path-due">Due date (optional)</Label>
            <Input
              id="assign-cert-path-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </span>
          {!targetId && (
            <span className="block text-xs text-amber-600">
              Select a certification path to continue.
            </span>
          )}
        </span>
      }
      onSubmit={handleSubmit}
      mapError={(raw) => {
        if (raw.includes("target_required")) return "Select a certification path to continue.";
        return null;
      }}
      successTitle="Certification path assigned"
    />
  );
}

// ---------------- Curriculum launcher ----------------
function AssignCurriculumLauncher({ userId, fullName, open, onOpenChange }: LauncherProps) {
  const queryClient = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const optionsQuery = useQuery({
    queryKey: ["curricula-list"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curricula")
        .select("id, name")
        .is("archived_at", null)
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  useEffect(() => {
    if (!open) {
      setTargetId("");
      setDueDate("");
    }
  }, [open]);

  const handleSubmit = async (reason: string): Promise<JustifiedActionResult> => {
    if (!targetId) throw new Error("target_required");
    const { data, error } = await supabase.rpc("assign_curriculum_bulk" as any, {
      p_user_ids: [userId],
      p_curriculum_id: targetId,
      p_source: "direct_assignment",
      p_certification_id: null,
      p_source_reference_id: null,
      p_due_at: toDueIso(dueDate),
      p_reason: reason,
    } as any);
    if (error) throw error;
    const result = (data ?? {}) as BulkRpcResult;
    await queryClient.invalidateQueries({ queryKey: ["members-search"] });
    await queryClient.invalidateQueries({ queryKey: ["get_user_learning_state", userId] });
    await queryClient.invalidateQueries({ queryKey: ["list_all_learning_assignments"] });
    if ((result.failed ?? 0) > 0) {
      throw new Error(firstFailureMessage(result, "Assignment failed."));
    }
    return { changed: (result.succeeded ?? 0) > 0 };
  };

  return (
    <JustifiedActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assign curriculum"
      description={
        <span className="space-y-3 block">
          <span className="block">
            You are about to assign a curriculum to{" "}
            <strong>{fullName ?? "this user"}</strong>.
          </span>
          <span className="block space-y-1.5">
            <Label htmlFor="assign-curriculum-target">Curriculum</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger id="assign-curriculum-target">
                <SelectValue placeholder={optionsQuery.isLoading ? "Loading…" : "Select a curriculum"} />
              </SelectTrigger>
              <SelectContent>
                {(optionsQuery.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
          <span className="block space-y-1.5">
            <Label htmlFor="assign-curriculum-due">Due date (optional)</Label>
            <Input
              id="assign-curriculum-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </span>
          {!targetId && (
            <span className="block text-xs text-amber-600">
              Select a curriculum to continue.
            </span>
          )}
        </span>
      }
      onSubmit={handleSubmit}
      mapError={(raw) => {
        if (raw.includes("target_required")) return "Select a curriculum to continue.";
        return null;
      }}
      successTitle="Curriculum assigned"
    />
  );
}

// ---------------- Module launcher ----------------
function AssignModuleLauncher({ userId, fullName, open, onOpenChange }: LauncherProps) {
  const queryClient = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const optionsQuery = useQuery({
    queryKey: ["modules-list"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, name")
        .is("archived_at", null)
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  useEffect(() => {
    if (!open) {
      setTargetId("");
      setDueDate("");
    }
  }, [open]);

  const handleSubmit = async (reason: string): Promise<JustifiedActionResult> => {
    if (!targetId) throw new Error("target_required");
    const { data, error } = await supabase.rpc("assign_module_bulk" as any, {
      p_user_ids: [userId],
      p_module_id: targetId,
      p_source: "direct_assignment",
      p_source_reference_id: null,
      p_due_at: toDueIso(dueDate),
      p_reason: reason,
    } as any);
    if (error) throw error;
    const result = (data ?? {}) as BulkRpcResult;
    await queryClient.invalidateQueries({ queryKey: ["members-search"] });
    await queryClient.invalidateQueries({ queryKey: ["get_user_learning_state", userId] });
    await queryClient.invalidateQueries({ queryKey: ["list_all_learning_assignments"] });
    if ((result.failed ?? 0) > 0) {
      throw new Error(firstFailureMessage(result, "Assignment failed."));
    }
    return { changed: (result.succeeded ?? 0) > 0 };
  };

  return (
    <JustifiedActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assign module"
      description={
        <span className="space-y-3 block">
          <span className="block">
            You are about to assign a module to{" "}
            <strong>{fullName ?? "this user"}</strong>.
          </span>
          <span className="block space-y-1.5">
            <Label htmlFor="assign-module-target">Module</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger id="assign-module-target">
                <SelectValue placeholder={optionsQuery.isLoading ? "Loading…" : "Select a module"} />
              </SelectTrigger>
              <SelectContent>
                {(optionsQuery.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
          <span className="block space-y-1.5">
            <Label htmlFor="assign-module-due">Due date (optional)</Label>
            <Input
              id="assign-module-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </span>
          {!targetId && (
            <span className="block text-xs text-amber-600">
              Select a module to continue.
            </span>
          )}
        </span>
      }
      onSubmit={handleSubmit}
      mapError={(raw) => {
        if (raw.includes("target_required")) return "Select a module to continue.";
        return null;
      }}
      successTitle="Module assigned"
    />
  );
}

// ---------------- Mentor launcher ----------------
function AssignMentorLauncher({ userId, fullName, open, onOpenChange }: LauncherProps) {
  const queryClient = useQueryClient();
  const [mentorId, setMentorId] = useState("");
  const [certificationId, setCertificationId] = useState<string | null>(null);

  const mentorsQuery = useQuery({
    queryKey: ["assignments-tab-mentors-list"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_impersonation_targets" as any, {
        p_query: null,
        p_limit: 100,
        p_offset: 0,
        p_account_types: null,
        p_is_mentor: true,
        p_account_status_in: ["active"],
        p_has_active_assignments: null,
        p_organization_ids: null,
        p_certification_statuses: null,
        p_last_active_within: null,
        p_created_within: null,
        p_has_supervisor: null,
        p_sort_column: "name",
        p_sort_direction: "asc",
        p_specific_user_id: null,
      } as any);
      if (error) throw error;
      return (data ?? []) as Array<{
        user_id: string;
        full_name: string | null;
        email: string | null;
      }>;
    },
  });

  const resolverQuery = useQuery({
    queryKey: ["get_mentorable_certifications", mentorId, userId],
    enabled: open && !!mentorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_mentorable_certifications" as any, {
        p_mentor_user_id: mentorId,
        p_trainee_user_id: userId,
      } as any);
      if (error) throw error;
      const payload = data as {
        certifications?: Array<{
          certification_id: string;
          certification_type: string;
          status: string;
        }>;
      } | null;
      return payload?.certifications ?? [];
    },
  });

  const certs = resolverQuery.data ?? [];

  useEffect(() => {
    if (certs.length === 1) {
      setCertificationId(certs[0].certification_id);
    } else {
      setCertificationId(null);
    }
  }, [resolverQuery.data]);

  useEffect(() => {
    if (!open) {
      setMentorId("");
      setCertificationId(null);
    }
  }, [open]);

  const handleSubmit = async (reason: string): Promise<JustifiedActionResult> => {
    if (!mentorId) throw new Error("mentor_required");
    if (!certificationId) throw new Error("certification_required");
    const { data, error } = await supabase.rpc("assign_mentor_pairs_bulk" as any, {
      p_mentor_user_id: mentorId,
      p_pairs: [{ trainee_user_id: userId, certification_id: certificationId }],
      p_reason: reason,
    } as any);
    if (error) throw error;
    const result = (data ?? {}) as BulkRpcResult;
    await queryClient.invalidateQueries({ queryKey: ["members-search"] });
    await queryClient.invalidateQueries({ queryKey: ["list_mentor_trainees"] });
    if ((result.failed ?? 0) > 0) {
      throw new Error(firstFailureMessage(result, "Mentor assignment failed."));
    }
    return { changed: (result.succeeded ?? 0) > 0 };
  };

  return (
    <JustifiedActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assign mentor"
      description={
        <span className="space-y-3 block">
          <span className="block">
            You are about to assign a mentor to{" "}
            <strong>{fullName ?? "this user"}</strong>.
          </span>
          <span className="block space-y-1.5">
            <Label htmlFor="assign-mentor-target">Mentor</Label>
            <Select value={mentorId} onValueChange={setMentorId}>
              <SelectTrigger id="assign-mentor-target">
                <SelectValue placeholder={mentorsQuery.isLoading ? "Loading…" : "Select a mentor"} />
              </SelectTrigger>
              <SelectContent>
                {(mentorsQuery.data ?? []).map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.full_name ?? m.email ?? m.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
          {mentorId && (
            <span className="block space-y-1.5">
              <Label>Certification</Label>
              {resolverQuery.isLoading ? (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Resolving certifications…
                </span>
              ) : resolverQuery.error ? (
                <span className="block text-xs text-destructive">
                  Failed to resolve certifications: {(resolverQuery.error as Error).message}
                </span>
              ) : certs.length === 0 ? (
                <span className="block text-xs text-destructive">
                  No certification this mentor is qualified for — assignment blocked.
                </span>
              ) : certs.length === 1 ? (
                <span className="block text-xs text-muted-foreground">
                  Will assign for: {certs[0].certification_type} ({certs[0].status})
                </span>
              ) : (
                <Select
                  value={certificationId ?? ""}
                  onValueChange={(v) => setCertificationId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a certification" />
                  </SelectTrigger>
                  <SelectContent>
                    {certs.map((c) => (
                      <SelectItem key={c.certification_id} value={c.certification_id}>
                        {c.certification_type} ({c.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </span>
          )}
        </span>
      }
      onSubmit={handleSubmit}
      mapError={(raw) => {
        if (raw.includes("mentor_required")) return "Select a mentor to continue.";
        if (raw.includes("certification_required"))
          return "A qualifying certification must be set.";
        return null;
      }}
      successTitle="Mentor assigned"
    />
  );
}

// ---------------- Main component ----------------
const CARDS: Array<{
  key: "cert_path" | "curriculum" | "module" | "mentor";
  title: string;
  description: string;
}> = [
  { key: "cert_path", title: "Cert path", description: "Assign a certification path to this user." },
  { key: "curriculum", title: "Curriculum", description: "Assign a standalone curriculum to this user." },
  { key: "module", title: "Module", description: "Assign a single module to this user." },
  { key: "mentor", title: "Mentor", description: "Assign a mentor to oversee this user." },
];

export default function MemberDrawerAssignments({
  userId,
  fullName,
  setHasUnsavedChanges,
}: Props) {
  const [certPathOpen, setCertPathOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [moduleOpen, setModuleOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);

  useEffect(() => {
    setHasUnsavedChanges(certPathOpen || curriculumOpen || moduleOpen || mentorOpen);
  }, [certPathOpen, curriculumOpen, moduleOpen, mentorOpen, setHasUnsavedChanges]);

  const handlers: Record<typeof CARDS[number]["key"], () => void> = {
    cert_path: () => setCertPathOpen(true),
    curriculum: () => setCurriculumOpen(true),
    module: () => setModuleOpen(true),
    mentor: () => setMentorOpen(true),
  };

  return (
    <div className="p-4 grid gap-3 sm:grid-cols-2">
      {CARDS.map((c) => (
        <Card key={c.key}>
          <CardHeader>
            <CardTitle className="text-base">{c.title}</CardTitle>
            <CardDescription>{c.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" onClick={handlers[c.key]}>
              Assign
            </Button>
          </CardContent>
        </Card>
      ))}

      <AssignCertPathLauncher
        userId={userId}
        fullName={fullName}
        open={certPathOpen}
        onOpenChange={setCertPathOpen}
      />
      <AssignCurriculumLauncher
        userId={userId}
        fullName={fullName}
        open={curriculumOpen}
        onOpenChange={setCurriculumOpen}
      />
      <AssignModuleLauncher
        userId={userId}
        fullName={fullName}
        open={moduleOpen}
        onOpenChange={setModuleOpen}
      />
      <AssignMentorLauncher
        userId={userId}
        fullName={fullName}
        open={mentorOpen}
        onOpenChange={setMentorOpen}
      />
    </div>
  );
}
