import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountRole } from "@/lib/accountRoles";
import MyResults from "@/pages/MyResults";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, MessageSquare, Search } from "lucide-react";

interface Peer {
  user_id: string;
  full_name: string | null;
  email: string;
  department_id: string | null;
  department_name: string | null;
  supervisor_user_id: string | null;
  org_level: string | null;
}

export default function SharedResults() {
  const { user } = useAuth();
  const { isCompanyAdmin, isOrgAdmin, isSuperAdmin } = useAccountRole();
  const navigate = useNavigate();

  const [instrument, setInstrument] = useState<"INST-001" | "INST-003">("INST-001");
  const [isAirsaEligible, setIsAirsaEligible] = useState(false);

  const [peers, setPeers] = useState<Peer[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);

  const [nameSearch, setNameSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [supervisorFilter, setSupervisorFilter] = useState<string>("all");

  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [checkedPeerIds, setCheckedPeerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    if (isCompanyAdmin || isOrgAdmin || isSuperAdmin) {
      setIsAirsaEligible(true);
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("org_users_public")
        .select("id")
        .eq("supervisor_user_id", user.id)
        .limit(1);
      setIsAirsaEligible((data ?? []).length > 0);
    })();
  }, [user, isCompanyAdmin, isOrgAdmin, isSuperAdmin]);

  useEffect(() => {
    if (!user) return;
    setLoadingPeers(true);
    setSelectedPeerId(null);
    setCheckedPeerIds(new Set());
    setNameSearch("");
    setDeptFilter("all");
    setSupervisorFilter("all");
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_accessible_peer_results", {
        p_instrument: instrument,
      });
      if (error) {
        console.error("get_accessible_peer_results error:", error);
        setPeers([]);
      } else {
        setPeers((data as Peer[]) ?? []);
      }
      setLoadingPeers(false);
    })();
  }, [user, instrument]);

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    peers.forEach(p => {
      if (p.department_id && p.department_name) map.set(p.department_id, p.department_name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [peers]);

  const supervisors = useMemo(() => {
    const ids = new Set(peers.map(p => p.supervisor_user_id).filter(Boolean) as string[]);
    return peers
      .filter(p => ids.has(p.user_id))
      .map(p => ({ id: p.user_id, name: p.full_name || p.email }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [peers]);

  const filteredPeers = useMemo(() => {
    return peers.filter(p => {
      if (nameSearch) {
        const q = nameSearch.toLowerCase();
        if (!(p.full_name ?? p.email).toLowerCase().includes(q)) return false;
      }
      if (deptFilter !== "all" && p.department_id !== deptFilter) return false;
      if (supervisorFilter !== "all" && p.supervisor_user_id !== supervisorFilter) return false;
      return true;
    });
  }, [peers, nameSearch, deptFilter, supervisorFilter]);

  const groupedByDept = useMemo(() => {
    const groups = new Map<string, Peer[]>();
    filteredPeers.forEach(p => {
      const key = p.department_name ?? "No Department";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    groups.forEach(arr => arr.sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email)));
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredPeers]);

  const toggleCheck = (id: string) => {
    setCheckedPeerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDiscussWithAI = () => {
    const peerList = Array.from(checkedPeerIds).join(",");
    navigate(`/ai-chat?peers=${peerList}&self=true`);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left pane: picker */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col">
        <div className="p-4 space-y-3 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Shared Results</h1>

          <Select value={instrument} onValueChange={(v) => setInstrument(v as "INST-001" | "INST-003")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INST-001">PTP</SelectItem>
              {isAirsaEligible && <SelectItem value="INST-003">AIRSA</SelectItem>}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              className="pl-8"
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
            />
          </div>

          {departments.length > 0 && (
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {supervisors.length > 0 && (
            <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All supervisors</SelectItem>
                {supervisors.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingPeers ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : groupedByDept.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No shared results available
            </div>
          ) : (
            groupedByDept.map(([dept, deptPeers]) => (
              <div key={dept} className="py-2">
                <div className="px-4 py-1 text-xs font-semibold uppercase text-muted-foreground">
                  {dept}
                </div>
                {deptPeers.map(peer => (
                  <div
                    key={peer.user_id}
                    className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-accent ${
                      selectedPeerId === peer.user_id ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedPeerId(peer.user_id)}
                  >
                    <Checkbox
                      checked={checkedPeerIds.has(peer.user_id)}
                      onCheckedChange={() => toggleCheck(peer.user_id)}
                      onClick={e => e.stopPropagation()}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{peer.full_name ?? peer.email}</p>
                      {peer.full_name && (
                        <p className="text-xs text-muted-foreground truncate">{peer.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {checkedPeerIds.size > 0 && (
          <div className="p-4 border-t border-border">
            <Button onClick={handleDiscussWithAI} className="w-full gap-2">
              <MessageSquare className="h-4 w-4" />
              Discuss with AI ({checkedPeerIds.size})
            </Button>
          </div>
        )}
      </div>

      {/* Right pane: results */}
      <div className="flex-1 overflow-y-auto">
        {selectedPeerId ? (
          <MyResults
            isCoachView={true}
            targetUserId={selectedPeerId}
            permissionLevel="full_results"
            viewLabel={peers.find(p => p.user_id === selectedPeerId)?.full_name ?? "Peer Results"}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-foreground mb-2">Select a colleague on the left to view their results</p>
            <p className="text-sm text-muted-foreground">Only colleagues who have shared their results with you will appear</p>
          </div>
        )}
      </div>
    </div>
  );
}
