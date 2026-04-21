import { useEffect, useState, useMemo, useCallback, useRef } from "react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAiUsage } from "@/hooks/useAiUsage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { FileText, MessageSquare, RefreshCw, ArrowRight, AlertTriangle, Brain, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DrivingFacetScores from "@/components/results/DrivingFacetScores";
import PTPNarrativeSections from "@/components/results/PTPNarrativeSections";
import NAINarrativeSections from "@/components/results/NAINarrativeSections";
import ExportPdfModal, { type PdfSections } from "@/components/results/ExportPdfModal";
import { generateResultsPdf, type PdfData } from "@/lib/generateResultsPdf";
import { generateNaiPdf, type NaiPdfData } from "@/lib/generateNaiPdf";

// Types
interface DimensionScore {
  mean?: number;
  band?: string;
  readiness_level?: string;
  level_mean?: number;
}

interface OverallProfile {
  high_dimensions?: string[];
  low_dimensions?: string[];
  triggered_cross_instrument_recommendations?: string[];
  profile_summary?: string;
}

interface AssessmentResult {
  id: string;
  assessment_id: string;
  user_id: string;
  instrument_id: string | null;
  instrument_version: string | null;
  dimension_scores: Record<string, DimensionScore>;
  overall_profile: OverallProfile | null;
  ai_narrative: string | null;
  ai_version: string | null;
  created_at: string;
}

interface AssessmentWithResult {
  result: AssessmentResult;
  completed_at: string | null;
  instrument_name: string;
  instrument_short_name: string | null;
  scale_type: string | null;
  isPTP: boolean;
  context_type: string | null;
}

const BAND_COLORS: Record<string, string> = {
  high: "#1F4E79",
  moderate_high: "#2E75B6",
  moderate: "#8EA9C1",
  moderate_low: "#F4B942",
  low: "#E07B00",
};

const PTP_DIMENSION_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#021F36",
  "DIM-PTP-02": "#006D77",
  "DIM-PTP-03": "#6D6875",
  "DIM-PTP-04": "#3C096C",
  "DIM-PTP-05": "#FFB703",
};

const PTP_DIMENSION_PASTEL: Record<string, string> = {
  "DIM-PTP-01": "#E8EDF1",
  "DIM-PTP-02": "#E6F2F3",
  "DIM-PTP-03": "#F0EFF1",
  "DIM-PTP-04": "#EEE8F5",
  "DIM-PTP-05": "#FFF8E6",
};

const PTP_DIMENSION_NAMES: Record<string, string> = {
  "DIM-PTP-01": "Protection",
  "DIM-PTP-02": "Participation",
  "DIM-PTP-03": "Prediction",
  "DIM-PTP-04": "Purpose",
  "DIM-PTP-05": "Pleasure",
};

const NAI_DIMENSION_COLORS: Record<string, string> = {
  "DIM-NAI-01": "#021F36",
  "DIM-NAI-02": "#F5741A",
  "DIM-NAI-03": "#006D77",
  "DIM-NAI-04": "#3C096C",
  "DIM-NAI-05": "#FFB703",
};

const NAI_DIMENSION_PASTEL: Record<string, string> = {
  "DIM-NAI-01": "#E8EDF1",
  "DIM-NAI-02": "#FEF0E7",
  "DIM-NAI-03": "#E0F0F2",
  "DIM-NAI-04": "#EDE5F4",
  "DIM-NAI-05": "#FFF8E1",
};

const READINESS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Foundational: { bg: "hsl(45 93% 95%)", text: "hsl(45 93% 30%)", border: "hsl(45 93% 47%)" },
  Proficient: { bg: "hsl(217 91% 95%)", text: "hsl(217 91% 30%)", border: "hsl(217 91% 50%)" },
  Advanced: { bg: "hsl(142 71% 95%)", text: "hsl(142 71% 25%)", border: "hsl(142 71% 45%)" },
};

interface MyResultsProps {
  isCoachView?: boolean;
  targetUserId?: string;
  preSelectedAssessmentId?: string;
  coachUserId?: string;
  permissionLevel?: 'full_results' | 'score_summary' | null;
  viewLabel?: string; // optional override for the page heading
  defaultInstrumentId?: string;
}

export default function MyResults({ isCoachView = false, targetUserId, preSelectedAssessmentId, coachUserId, permissionLevel = null, viewLabel, defaultInstrumentId }: MyResultsProps) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const effectiveUserId = isCoachView && targetUserId ? targetUserId : user?.id;
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [assessments, setAssessments] = useState<AssessmentWithResult[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [ptpContextTab, setPtpContextTab] = useState<'professional' | 'personal' | 'combined' | null>(null);
  const [ptpTabOverrideId, setPtpTabOverrideId] = useState<string | null>(null);
  const [bothSplitScores, setBothSplitScores] = useState<{
    professional: Record<string, DimensionScore>;
    personal: Record<string, DimensionScore>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingNarrative, setPollingNarrative] = useState(false);
  const [dimensionNameMap, setDimensionNameMap] = useState<Map<string, string>>(new Map());
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratedVersion, setRegeneratedVersion] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState<{ limit: number; tier: string } | null>(null);
  const { fetchUsage, consumeMessage } = useAiUsage();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [clientName, setClientName] = useState<string | null>(null);
  const [debriefPendingIds, setDebriefPendingIds] = useState<Set<string>>(new Set());

  const [shareWithCoach, setShareWithCoach] = useState<boolean | null>(null);

  const [coachViewActive, setCoachViewActive] = useState(isCoachView);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant'; content: string; timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [showChatUpgradeDialog, setShowChatUpgradeDialog] = useState(false);

  useEffect(() => {
    return () => {
      if (chatSessionIdRef.current) {
        supabase.rpc('close_chat_session', { p_session_id: chatSessionIdRef.current });
      }
    };
  }, []);

  // Fetch client name and share preference when in coach view
  useEffect(() => {
    if (!isCoachView || !targetUserId) return;
    supabase
      .from("users")
      .select("full_name, share_results_with_coach")
      .eq("id", targetUserId)
      .single()
      .then(({ data }) => {
        setClientName(data?.full_name ?? null);
        setShareWithCoach(data?.share_results_with_coach ?? false);
      });
  }, [isCoachView, targetUserId]);

  useEffect(() => {
    setCoachViewActive(isCoachView);
  }, [isCoachView]);

  const displayName = isCoachView ? clientName : profile?.full_name;

  // Fetch all completed assessment results
  useEffect(() => {
    if (!effectiveUserId) return;

    const fetchResults = async () => {
      setLoading(true);

      // Get all results for this user
      const { data: results, error: resultsErr } = await supabase
        .from("assessment_results")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (resultsErr || !results?.length) {
        setLoading(false);
        return;
      }

      // Get assessment details
      const assessmentIds = results.map((r) => r.assessment_id);
      const { data: assessmentRows } = await supabase
        .from("assessments")
        .select("id, completed_at, instrument_id, context_type")
        .in("id", assessmentIds);

      // Get unique instrument IDs
      const instrumentIds = [
        ...new Set(results.map((r) => r.instrument_id).filter(Boolean)),
      ] as string[];
      const { data: instruments } = await supabase
        .from("instruments")
        .select("instrument_id, instrument_name, scale_type, short_name")
        .in("instrument_id", instrumentIds);

      // Fetch dimension names for display
      const { data: dimensionRows } = await supabase
        .from("dimensions")
        .select("dimension_id, dimension_name")
        .in("instrument_id", instrumentIds);

      const dimNameMap = new Map(
        (dimensionRows ?? []).map((d) => [d.dimension_id, d.dimension_name])
      );
      setDimensionNameMap(dimNameMap);

      const instrumentMap = new Map(
        (instruments ?? []).map((i) => [i.instrument_id, i])
      );
      const assessmentMap = new Map(
        (assessmentRows ?? []).map((a) => [a.id, a])
      );

      const combined: AssessmentWithResult[] = results.map((r) => {
        const assessment = assessmentMap.get(r.assessment_id);
        const instrument = instrumentMap.get(r.instrument_id ?? "");
        return {
          result: r as unknown as AssessmentResult,
          completed_at: assessment?.completed_at ?? r.created_at,
          instrument_name: instrument?.instrument_name ?? r.instrument_id ?? "Unknown",
          instrument_short_name: instrument?.short_name ?? null,
          scale_type: instrument?.scale_type ?? null,
          isPTP: (r.instrument_id ?? "").toUpperCase().includes("INST-001"),
          context_type: assessmentMap.get(r.assessment_id)?.context_type ?? null,
        };
      });

      // Coach filtering: if share_results_with_coach is false, only show linked assessments
      let filtered = combined;
      if (isCoachView && coachUserId && shareWithCoach === false) {
        const { data: linkedRows } = await supabase
          .from("coach_clients")
          .select("assessment_id")
          .eq("coach_user_id", coachUserId)
          .eq("client_user_id", effectiveUserId)
          .not("assessment_id", "is", null);
        const linkedIds = new Set((linkedRows ?? []).map(r => r.assessment_id));
        filtered = combined.filter(a => linkedIds.has(a.result.assessment_id));
      }

      // Check which coach-invited assessments have results_released = false
      if (!isCoachView && effectiveUserId) {
        const assessmentIds = filtered.map(a => a.result.assessment_id);
        if (assessmentIds.length > 0) {
          const { data: ccRows } = await supabase
            .from('coach_clients')
            .select('assessment_id, results_released')
            .eq('client_user_id', effectiveUserId)
            .in('assessment_id', assessmentIds);

          const pendingIds = new Set<string>(
            (ccRows ?? [])
              .filter(r => r.results_released === false)
              .map(r => r.assessment_id)
              .filter(Boolean) as string[]
          );
          setDebriefPendingIds(pendingIds);
        }
      }

      setAssessments(filtered);
      if (preSelectedAssessmentId) {
        const preSelected = combined.find(a => a.result.assessment_id === preSelectedAssessmentId);
        setSelectedId(preSelected?.result.id ?? combined[0]?.result.id ?? "");
      } else {
        setSelectedId(combined[0]?.result.id ?? "");
      }
      // Initialize PTP context tab based on most recent PTP result
      const mostRecentPtp = filtered.find(a => a.isPTP);
      if (mostRecentPtp?.context_type === 'professional') setPtpContextTab('professional');
      else if (mostRecentPtp?.context_type === 'personal') setPtpContextTab('personal');
      else if (mostRecentPtp?.context_type === 'both') setPtpContextTab('combined');
      else setPtpContextTab(null);

      setLoading(false);
    };

    fetchResults();
  }, [effectiveUserId, preSelectedAssessmentId, isCoachView, coachUserId, shareWithCoach]);

  // Selected assessment
  const selected = useMemo(
    () => assessments.find((a) => a.result.id === selectedId),
    [assessments, selectedId]
  );

  const isNAI = (selected?.result.instrument_id ?? "").includes("INST-002");

  // PTP tab logic
  const ptpProfessionalResults = useMemo(() =>
    assessments.filter(a => a.isPTP && a.context_type === 'professional')
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()),
    [assessments]);

  const ptpPersonalResults = useMemo(() =>
    assessments.filter(a => a.isPTP && a.context_type === 'personal')
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()),
    [assessments]);

  const isBothAssessment = selected?.isPTP && selected.context_type === 'both';
  const hasPtpTabs = (ptpProfessionalResults.length > 0 && ptpPersonalResults.length > 0) || isBothAssessment;
  const showPtpTabs = selected?.isPTP && hasPtpTabs;

  // For combined tab: merge dimension scores from most recent professional + personal
  const combinedDimensionScores = useMemo(() => {
    if (!hasPtpTabs || !ptpProfessionalResults[0] || !ptpPersonalResults[0]) return null;
    const profScores = ptpProfessionalResults[0].result.dimension_scores;
    const persScores = ptpPersonalResults[0].result.dimension_scores;
    const allDims = new Set([...Object.keys(profScores), ...Object.keys(persScores)]);
    const merged: Record<string, DimensionScore> = {};
    allDims.forEach(dim => {
      const profMean = profScores[dim]?.mean ?? null;
      const persMean = persScores[dim]?.mean ?? null;
      if (profMean !== null && persMean !== null) {
        merged[dim] = { mean: (profMean + persMean) / 2, band: profScores[dim]?.band ?? persScores[dim]?.band };
      } else if (profMean !== null) {
        merged[dim] = profScores[dim];
      } else {
        merged[dim] = persScores[dim];
      }
    });
    return merged;
  }, [hasPtpTabs, ptpProfessionalResults, ptpPersonalResults]);

  // Effective selected based on tab
  const effectiveSelected = useMemo(() => {
    if (!selected?.isPTP || !hasPtpTabs) return selected;
    if (ptpContextTab === 'professional') {
      const override = ptpTabOverrideId ? ptpProfessionalResults.find(a => a.result.id === ptpTabOverrideId) : null;
      return override ?? ptpProfessionalResults[0] ?? selected;
    }
    if (ptpContextTab === 'personal') {
      const override = ptpTabOverrideId ? ptpPersonalResults.find(a => a.result.id === ptpTabOverrideId) : null;
      return override ?? ptpPersonalResults[0] ?? selected;
    }
    if (ptpContextTab === 'combined') return ptpProfessionalResults[0] ?? selected;
    return selected;
  }, [selected, hasPtpTabs, ptpContextTab, ptpTabOverrideId, ptpProfessionalResults, ptpPersonalResults]);

  // Effective dimension scores
  const effectiveDimensionScores = useMemo(() => {
    if (isBothAssessment && bothSplitScores) {
      if (ptpContextTab === 'professional') return Object.entries(bothSplitScores.professional);
      if (ptpContextTab === 'personal') return Object.entries(bothSplitScores.personal);
      if (ptpContextTab === 'combined') return effectiveSelected ? Object.entries(effectiveSelected.result.dimension_scores) : [];
    }
    if (ptpContextTab === 'combined' && combinedDimensionScores) {
      return Object.entries(combinedDimensionScores);
    }
    return effectiveSelected ? Object.entries(effectiveSelected.result.dimension_scores) : [];
  }, [ptpContextTab, combinedDimensionScores, effectiveSelected, isBothAssessment, bothSplitScores]);

  // Poll for AI narrative
  useEffect(() => {
    if (!selected || selected.result.ai_narrative) {
      setPollingNarrative(false);
      return;
    }

    setPollingNarrative(true);
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("assessment_results")
        .select("ai_narrative, ai_version")
        .eq("id", selected.result.id)
        .single();

      if (data?.ai_narrative) {
        setAssessments((prev) =>
          prev.map((a) =>
            a.result.id === selected.result.id
              ? {
                  ...a,
                  result: {
                    ...a.result,
                    ai_narrative: data.ai_narrative,
                    ai_version: data.ai_version,
                  },
                }
              : a
          )
        );
        setPollingNarrative(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selected?.result.id, selected?.result.ai_narrative]);

  // Split scores by context for "both" PTP assessments
  useEffect(() => {
    if (!selected?.isPTP || selected.context_type !== 'both') {
      setBothSplitScores(null);
      return;
    }
    const fetchSplitScores = async () => {
      const { data: responses } = await supabase
        .from('assessment_responses')
        .select('response_value_numeric, is_reverse_scored, item_id')
        .eq('assessment_id', selected.result.assessment_id);
      if (!responses?.length) return;

      const itemIds = responses.map(r => r.item_id);
      const { data: items } = await supabase
        .from('items')
        .select('item_id, dimension_id, context_type')
        .in('item_id', itemIds);

      const itemMap = new Map((items ?? []).map(i => [i.item_id, i]));

      const profDims: Record<string, number[]> = {};
      const persDims: Record<string, number[]> = {};

      responses.forEach(r => {
        const item = itemMap.get(r.item_id);
        if (!item?.dimension_id) return;
        const raw = Number(r.response_value_numeric);
        const value = r.is_reverse_scored ? 100 - raw : raw;
        const ctx = item.context_type;
        const dim = item.dimension_id;
        if (ctx === 'professional') {
          if (!profDims[dim]) profDims[dim] = [];
          profDims[dim].push(value);
        } else if (ctx === 'personal') {
          if (!persDims[dim]) persDims[dim] = [];
          persDims[dim].push(value);
        }
      });

      const toScores = (dimMap: Record<string, number[]>): Record<string, DimensionScore> => {
        const result: Record<string, DimensionScore> = {};
        Object.entries(dimMap).forEach(([dim, vals]) => {
          result[dim] = { mean: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 };
        });
        return result;
      };

      setBothSplitScores({
        professional: toScores(profDims),
        personal: toScores(persDims),
      });
    };
    fetchSplitScores();
  }, [selected?.result.assessment_id, selected?.context_type]);

  // Regenerate handler
  const handleRegenerate = useCallback(async () => {
    if (!selected) return;
    setRegenerating(true);
    setRegeneratedVersion(null);
    setLimitReached(null);

    // Consume one AI interaction from usage limit (report_generation type)
    const usageData = await consumeMessage(profile?.subscription_tier ?? "base", "report_generation");
    if (!usageData || !usageData.allowed) {
      setLimitReached({ limit: usageData?.limit ?? 30, tier: usageData?.tier ?? profile?.subscription_tier ?? "base" });
      setRegenerating(false);
      return;
    }

    // Call generate-report
    const { error } = await supabase.functions.invoke("generate-report", {
      body: { assessment_result_id: selected.result.id },
    });

    if (error) {
      toast({ title: "Error", description: "Failed to regenerate interpretation.", variant: "destructive" });
      setRegenerating(false);
      return;
    }

    // Poll for updated narrative
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("assessment_results")
        .select("ai_narrative, ai_version")
        .eq("id", selected.result.id)
        .single();

      if (data?.ai_narrative && data.ai_narrative !== selected.result.ai_narrative) {
        setAssessments((prev) =>
          prev.map((a) =>
            a.result.id === selected.result.id
              ? { ...a, result: { ...a.result, ai_narrative: data.ai_narrative, ai_version: data.ai_version } }
              : a
          )
        );
        setRegeneratedVersion(data.ai_version);
        setRegenerating(false);
        clearInterval(poll);
      }
    }, 5000);

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(poll);
      setRegenerating(false);
    }, 120000);
  }, [selected, consumeMessage, profile?.subscription_tier, toast]);

  // Derived data
  const dimensionScores = effectiveDimensionScores;

  const sortedDimensions = useMemo(() => {
    if (!dimensionScores.length) return [];
    return [...dimensionScores].sort((a, b) => {
      const aVal = a[1].mean ?? a[1].level_mean ?? 0;
      const bVal = b[1].mean ?? b[1].level_mean ?? 0;
      return bVal - aVal;
    });
  }, [dimensionScores]);

  const highestDimension = sortedDimensions[0]?.[0] ?? "—";
  const lowestDimension =
    sortedDimensions[sortedDimensions.length - 1]?.[0] ?? "—";

  const resolveDimensionName = (id: string) =>
    dimensionNameMap.get(id) ?? formatDimensionName(id);

  const isSliderInstrument =
    selected?.scale_type?.includes("slider") ||
    selected?.scale_type?.includes("0-100") ||
    ["PTP", "NAI"].some((s) =>
      (selected?.result.instrument_id ?? "").toUpperCase().includes(s)
    );

  const isAIRSA = (selected?.result.instrument_id ?? "")
    .toUpperCase()
    .includes("AIRSA");

  const recommendations =
    (selected?.result.overall_profile as OverallProfile)
      ?.triggered_cross_instrument_recommendations ?? [];

  // PDF export handler
  const handlePdfExport = useCallback(async (sections: PdfSections) => {
    if (!selected) return;

    const PTP_ITEM_FACET_NAMES: Record<number, string> = {
      1:"Physical safety orientation",2:"Emotional safety (work)",3:"Financial security orientation",4:"Short-term loss aversion",5:"Status and standing vigilance",6:"Personal fairness sensitivity",7:"Equality and reciprocity need",8:"Resilience and recovery capacity",9:"Physical health vigilance",10:"Need to be trusted",11:"Need to trust others",12:"Similarity-based affiliation",13:"Group belonging need",14:"Need for individual differentiation",15:"Contrarian opinion drive",16:"Team orientation",17:"Self-esteem and self-respect",18:"Social comparison drive",19:"Recognition need",20:"Approval and respect need",21:"Power and influence need (work)",22:"Status and prestige need (work)",23:"Embarrassment avoidance",24:"Impostor sensitivity",25:"Future certainty need (work)",26:"Expectation clarity need (work)",27:"Evaluation criteria need",28:"Reward predictability need",29:"Autonomy and control need (work)",30:"Action orientation (work)",31:"Information and situational awareness",32:"Correctness need",33:"Perfectionism",34:"Status quo and stability need (work)",35:"Sense-making need (work)",36:"Consistency need",37:"Ambiguity tolerance (work)",38:"Surprise aversion (work)",39:"Conformity need",40:"Doubt tolerance",41:"Authenticity need",42:"Risk tolerance (work)",43:"Curiosity",44:"Voice and influence need",45:"Flexibility and flow capacity (work)",46:"Commitment reliability need (work)",47:"Well-being vigilance for close others",48:"Emotional safety (social)",49:"Financial loss aversion",50:"Environmental safety scanning",51:"Other-directed fairness sensitivity",52:"Animal welfare sensitivity",53:"Social equality vigilance",54:"Mental health vigilance",55:"Emotional health vigilance",56:"Spiritual health vigilance",57:"Power and influence need (social)",58:"Status and prestige need (social)",59:"Benevolence drive",60:"Future certainty need (social)",61:"Expectation clarity need (social)",62:"Autonomy and control need (social)",63:"Action orientation (social)",64:"Status quo and stability need (social)",65:"Sense-making need (social)",66:"Ambiguity tolerance (social)",67:"Surprise aversion (social)",68:"Risk tolerance (social)",69:"Self-directed independence need",70:"Tradition and ritual orientation",71:"Harmony and stability need",72:"Flexibility and flow capacity (social)",73:"Commitment reliability need (social)",74:"Mastery and craft orientation",75:"Self-development drive",76:"Mission and meaning orientation",77:"Values alignment (personal)",78:"Values alignment (organisational)",79:"Artistic and creative expression",80:"Spiritual orientation",81:"Passionate pursuit orientation",82:"Challenge and growth orientation",83:"Truth-seeking orientation",84:"Happiness pursuit",85:"Sensory and sensual gratification",86:"Instant gratification orientation",87:"Stimulation and excitement need",88:"Play orientation",89:"Love and attachment need"
    };

    let elevatedFacets: { itemNumber: number; facetName: string; itemText: string; score: number; dimensionId: string; interpretation: { positive_self: string[]; negative_self: string[]; positive_others: string[]; negative_others: string[] } | null }[] = [];
    let suppressedFacets: typeof elevatedFacets = [];
    let assessmentResponses: { itemNumber: number; facetName: string; itemText: string; score: number; dimensionId: string }[] = [];
    let narrativeSections: { profile_overview?: string; dimension_highlights?: Record<string, string>; cross_assessment?: string } | null = null;

    // Fetch narrative sections for active context
    if (effectiveSelected?.isPTP && ptpContextTab) {
      const { data: narrativeRow } = await supabase
        .from("facet_interpretations")
        .select("facet_data")
        .eq("assessment_result_id", effectiveSelected.result.id)
        .eq("section_type", `narrative_${ptpContextTab}`)
        .maybeSingle();
      if (narrativeRow?.facet_data) {
        narrativeSections = narrativeRow.facet_data as typeof narrativeSections;
      }
    }

    if (selected.isPTP && effectiveSelected) {
      // Fetch facet interpretations
      const { data: facetRow } = await supabase
        .from("facet_interpretations")
        .select("facet_data")
        .eq("assessment_result_id", effectiveSelected.result.id)
        .eq("section_type", "facet_insights")
        .maybeSingle();

      const facetInterpretations: { name: string; positive_self: string[]; negative_self: string[]; positive_others: string[]; negative_others: string[] }[] = (facetRow?.facet_data as any) ?? [];

      const { data: responses } = await supabase
        .from("assessment_responses")
        .select("response_value_numeric, is_reverse_scored, item_id")
        .eq("assessment_id", effectiveSelected.result.assessment_id);

      if (responses?.length) {
        const itemIds = responses.map((r) => r.item_id);
        const { data: items } = await supabase
          .from("items")
          .select("item_id, item_text, item_number, dimension_id, context_type")
          .in("item_id", itemIds);

        const itemMap = new Map((items ?? []).map((i) => [i.item_id, i]));

        let scored = responses.map((r) => {
          const item = itemMap.get(r.item_id);
          const raw = Number(r.response_value_numeric);
          const value = r.is_reverse_scored ? 100 - raw : raw;
          return {
            itemNumber: item?.item_number ?? 0,
            facetName: PTP_ITEM_FACET_NAMES[item?.item_number ?? 0] ?? item?.item_text?.slice(0, 40) ?? "",
            itemText: item?.item_text ?? "",
            score: Math.round(value),
            dimensionId: item?.dimension_id ?? "",
            contextType: item?.context_type ?? null,
          };
        });

        if (ptpContextTab === "professional" || ptpContextTab === "personal") {
          const filtered = scored.filter((s) => s.contextType === ptpContextTab);
          if (filtered.length > 0) scored = filtered;
        }

        const values = scored.map((s) => s.score);
        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const stdDev = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);

          elevatedFacets = scored
            .filter((s) => s.score > mean + stdDev)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(({ contextType, ...rest }) => ({
              ...rest,
              interpretation: facetInterpretations.find((fi) => fi.name === rest.facetName) ?? null,
            }));

          suppressedFacets = scored
            .filter((s) => s.score < mean - stdDev)
            .sort((a, b) => a.score - b.score)
            .slice(0, 10)
            .map(({ contextType, ...rest }) => ({
              ...rest,
              interpretation: facetInterpretations.find((fi) => fi.name === rest.facetName) ?? null,
            }));
        }

        if (sections.assessmentResponses) {
          assessmentResponses = scored
            .sort((a, b) => a.itemNumber - b.itemNumber)
            .map(({ contextType, ...rest }) => rest);
        }
      }
    }

    const contextLabel =
      ptpContextTab === "professional" ? "Professional"
      : ptpContextTab === "personal" ? "Personal"
      : ptpContextTab === "combined" ? "Combined"
      : "";

    const pdfData: PdfData = {
      userName: displayName ?? "Participant",
      instrumentName: selected.instrument_name,
      instrumentShortName: selected.instrument_short_name ?? selected.result.instrument_id ?? selected.instrument_name.replace(/\s+/g, ""),
      instrumentVersion: selected.result.instrument_version ?? "—",
      dateTaken: selected.completed_at ? format(new Date(selected.completed_at), "MMMM d, yyyy") : "—",
      contextLabel,
      dimensions: sortedDimensions.map(([id, score]) => ({
        name: resolveDimensionName(id),
        score: Math.round(score.mean ?? score.level_mean ?? 0),
        band: score.band ?? score.readiness_level ?? "moderate",
        color: selected.isPTP ? (PTP_DIMENSION_COLORS[id] ?? "#8EA9C1") : (BAND_COLORS[score.band ?? "moderate"] ?? "#8EA9C1"),
        pastelColor: selected.isPTP ? (PTP_DIMENSION_PASTEL[id] ?? "#F9F7F1") : "#F9F7F1",
        dimensionId: id,
      })),
      statCards: [
        { label: "Dimensions Assessed", value: String(dimensionScores.length) },
        { label: "Highest Dimension", value: resolveDimensionName(highestDimension) },
        { label: "Lowest Dimension", value: resolveDimensionName(lowestDimension) },
      ],
      narrativeSections,
      elevatedFacets,
      suppressedFacets,
      assessmentResponses,
      recommendations,
      isSliderInstrument: !!isSliderInstrument,
      isPTP: !!selected.isPTP,
    };

    generateResultsPdf(pdfData, sections);
  }, [selected, effectiveSelected, ptpContextTab, sortedDimensions, dimensionScores, dimensionNameMap, displayName, recommendations, isSliderInstrument, highestDimension, lowestDimension]);

  const handleNaiPdfExport = useCallback(async (sections: import("@/components/results/ExportPdfModal").NaiPdfSectionsUi) => {
    if (!selected || !isNAI) return;

    const NAI_DIMENSION_NAMES_LOCAL: Record<string, string> = {
      "DIM-NAI-01": "Certainty",
      "DIM-NAI-02": "Agency",
      "DIM-NAI-03": "Fairness",
      "DIM-NAI-04": "Ego Stability",
      "DIM-NAI-05": "Saturation Threshold",
    };

    const bandOf = (score: number): string => {
      if (score >= 76) return "High";
      if (score >= 51) return "Elevated";
      if (score >= 26) return "Moderate";
      return "Low";
    };

    const dimensionsForPdf = Object.keys(NAI_DIMENSION_NAMES_LOCAL).map((dimId) => {
      const found = dimensionScores.find(([id]) => id === dimId);
      const score = Math.round(found?.[1]?.mean ?? 0);
      return {
        dimensionId: dimId,
        name: dimensionNameMap.get(dimId) ?? NAI_DIMENSION_NAMES_LOCAL[dimId] ?? dimId,
        score,
        band: bandOf(score),
        color: NAI_DIMENSION_COLORS[dimId] ?? "#021F36",
        pastelColor: NAI_DIMENSION_PASTEL[dimId] ?? "#F9F7F1",
      };
    });

    const { data: allItems } = await supabase
      .from("items")
      .select("item_id, item_text, item_number, dimension_id, facet_name")
      .eq("instrument_id", "INST-002")
      .order("item_number");

    const { data: responsesData } = await supabase
      .from("assessment_responses")
      .select("response_value_numeric, is_reverse_scored, item_id")
      .eq("assessment_id", selected.result.assessment_id);

    const responseByItem = new Map((responsesData ?? []).map((r) => [r.item_id, r]));

    const assessmentResponses = (allItems ?? []).map((item) => {
      const r = responseByItem.get(item.item_id);
      let score: number | null = null;
      if (r) {
        const raw = Number(r.response_value_numeric);
        score = Math.round(r.is_reverse_scored ? 100 - raw : raw);
      }
      return {
        itemNumber: item.item_number ?? 0,
        facetName: item.facet_name ?? item.item_text?.slice(0, 40) ?? "",
        itemText: item.item_text ?? "",
        score,
        dimensionId: item.dimension_id ?? "",
        hasResponse: !!r,
      };
    }).sort((a, b) => a.itemNumber - b.itemNumber);

    const outliersRaw = assessmentResponses
      .filter(r => r.hasResponse && (r.score ?? 0) >= 75)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const requiredSections = [
      "nai_profile_overview",
      ...Object.keys(NAI_DIMENSION_NAMES_LOCAL).map(d => `nai_dimension_highlight_${d}`),
      ...outliersRaw.map(o => `nai_item_interpretation_${o.itemNumber}`),
      "nai_cross_assessment",
      "nai_pattern_alert",
      ...Object.keys(NAI_DIMENSION_NAMES_LOCAL).map(d => `nai_coach_questions_${d}`),
    ];

    const { data: interpRows } = await supabase
      .from("facet_interpretations")
      .select("section_type, facet_data")
      .eq("assessment_result_id", selected.result.id)
      .in("section_type", requiredSections);

    const interpMap: Record<string, any> = {};
    (interpRows ?? []).forEach(row => { if (row.section_type) interpMap[row.section_type] = row.facet_data; });

    let cafesMappings: any[] = [];
    if (coachViewActive) {
      const elevatedDimIds = dimensionScores
        .filter(([, s]) => (s.mean ?? 0) >= 51)
        .map(([id]) => id);
      if (elevatedDimIds.length > 0) {
        const { data: maps } = await supabase
          .from("cafes_ptp_mapping")
          .select("nai_dimension_id, primary_ptp_domain, secondary_ptp_domain, facets, coaching_questions")
          .in("nai_dimension_id", elevatedDimIds);
        cafesMappings = maps ?? [];
      }
    }

    const buildRelatedPtpFacets = (dimensionId: string): string | null => {
      if (!coachViewActive) return null;
      const mapping = cafesMappings.find(m => m.nai_dimension_id === dimensionId);
      if (!mapping) return null;
      const facets = Array.isArray(mapping.facets) ? mapping.facets : [];
      if (facets.length === 0) return null;
      return facets
        .map((f: any) => {
          const workRef = Array.isArray(f.work_items) ? f.work_items[0] : f.work_item;
          const socialRef = Array.isArray(f.social_items) ? f.social_items[0] : f.social_item;
          const refs = [workRef, socialRef].filter(Boolean).join(", ");
          const name = f.name ?? f.facet_name;
          return refs ? `${name} (${refs})` : name;
        })
        .filter(Boolean)
        .join("; ");
    };

    const outlierItems = outliersRaw.map(o => ({
      itemNumber: o.itemNumber,
      facetName: o.facetName,
      itemText: o.itemText,
      score: o.score ?? 0,
      dimensionId: o.dimensionId,
      dimensionName: dimensionNameMap.get(o.dimensionId) ?? NAI_DIMENSION_NAMES_LOCAL[o.dimensionId] ?? o.dimensionId,
      interpretation: interpMap[`nai_item_interpretation_${o.itemNumber}`]?.text ?? null,
      relatedPtpFacets: buildRelatedPtpFacets(o.dimensionId),
    }));

    const cafesMappingForPdf = coachViewActive
      ? Object.keys(NAI_DIMENSION_NAMES_LOCAL)
          .map(dimId => {
            const found = dimensionScores.find(([id]) => id === dimId);
            const score = Math.round(found?.[1]?.mean ?? 0);
            if (score < 51) return null;
            const mapping = cafesMappings.find(m => m.nai_dimension_id === dimId);
            if (!mapping) return null;
            const facets = Array.isArray(mapping.facets) ? mapping.facets : [];
            const aiQuestions = interpMap[`nai_coach_questions_${dimId}`]?.questions;
            const fallbackQuestions = Array.isArray(mapping.coaching_questions) ? mapping.coaching_questions : [];
            const questions: string[] = Array.isArray(aiQuestions) && aiQuestions.length > 0 ? aiQuestions : fallbackQuestions;
            return {
              dimensionId: dimId,
              dimensionName: dimensionNameMap.get(dimId) ?? NAI_DIMENSION_NAMES_LOCAL[dimId] ?? dimId,
              score,
              band: bandOf(score),
              color: NAI_DIMENSION_COLORS[dimId] ?? "#021F36",
              pastelColor: NAI_DIMENSION_PASTEL[dimId] ?? "#F9F7F1",
              primaryPtpDomain: mapping.primary_ptp_domain,
              secondaryPtpDomain: mapping.secondary_ptp_domain,
              ptpFacets: facets.map((f: any) => {
                const workRef = Array.isArray(f.work_items) ? f.work_items[0] : f.work_item;
                const socialRef = Array.isArray(f.social_items) ? f.social_items[0] : f.social_item;
                return {
                  name: f.name ?? f.facet_name,
                  refs: [workRef, socialRef].filter(Boolean).join(", "),
                };
              }),
              coachingQuestions: questions,
            };
          })
          .filter((m): m is NonNullable<typeof m> => m !== null)
      : [];

    const highlightsForPdf = dimensionsForPdf.map(d => {
      const highlight = interpMap[`nai_dimension_highlight_${d.dimensionId}`];
      return {
        dimensionId: d.dimensionId,
        name: d.name,
        score: d.score,
        band: d.band,
        color: d.color,
        pastelColor: d.pastelColor,
        highlight: highlight?.highlight ?? null,
        areasOfFocus: highlight?.areas_of_focus ?? null,
      };
    });

    const crossAssessmentData = interpMap.nai_cross_assessment;
    const crossAssessment = crossAssessmentData
      ? {
          interpretation: crossAssessmentData.interpretation ?? "",
          suggestions: Array.isArray(crossAssessmentData.suggestions) ? crossAssessmentData.suggestions : [],
        }
      : null;

    const patternAlertData = interpMap.nai_pattern_alert;
    const patternAlert = coachViewActive && patternAlertData
      ? {
          body: patternAlertData.body ?? "",
          suggestions: Array.isArray(patternAlertData.suggestions) ? patternAlertData.suggestions : [],
        }
      : null;

    const pdfData: NaiPdfData = {
      userName: displayName ?? "Participant",
      instrumentName: selected.instrument_name,
      instrumentShortName: selected.instrument_short_name ?? "NAI",
      instrumentVersion: selected.result.instrument_version ?? "—",
      dateTaken: selected.completed_at ? format(new Date(selected.completed_at), "MMMM d, yyyy") : "—",
      isCoachView: coachViewActive,
      statCards: [
        { label: "Dimensions Assessed", value: String(dimensionScores.length) },
        { label: "Highest Dimension", value: resolveDimensionName(highestDimension) },
        { label: "Lowest Dimension", value: resolveDimensionName(lowestDimension) },
      ],
      dimensions: dimensionsForPdf,
      profileOverviewText: interpMap.nai_profile_overview?.text ?? null,
      dimensionHighlights: highlightsForPdf,
      patternAlert,
      outlierItems,
      cafesPtpMapping: cafesMappingForPdf,
      crossAssessment,
      assessmentResponses,
    };

    generateNaiPdf(pdfData, sections);
  }, [selected, isNAI, coachViewActive, dimensionScores, dimensionNameMap, displayName, highestDimension, lowestDimension]);

  const chatMessagesRef = useRef<Array<{role: 'user' | 'assistant'; content: string; timestamp: Date}>>([]);
  const chatSessionIdRef = useRef<string | null>(null);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !selected || chatLoading) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    const newUserMsg = { role: 'user' as const, content: userMessage, timestamp: new Date() };

    const updatedWithUser = [...chatMessagesRef.current, newUserMsg];
    chatMessagesRef.current = updatedWithUser;
    setChatMessages(updatedWithUser);
    setChatLoading(true);

    let sessionId = chatSessionId;
    if (!sessionId) {
      const { data: session } = await supabase.from('chat_sessions').insert({
        user_id: user!.id,
        assessment_result_ids: [selected.result.id],
        messages: [],
        message_count: 0,
        started_at: new Date().toISOString(),
      }).select('id').single();
      if (session) {
        sessionId = session.id;
        setChatSessionId(session.id);
        chatSessionIdRef.current = session.id;
      }
    }

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          message: userMessage,
          conversation_history: chatMessagesRef.current.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          assessment_result_ids: [selected.result.id],
          subscription_tier: profile?.subscription_tier ?? 'base',
        },
        headers: { Authorization: `Bearer ${authSession?.access_token}` },
      });

      if (response.error || response.data?.limit_reached) {
        const errMsg = response.data?.limit_reached
          ? "You've reached your monthly AI message limit."
          : "Failed to get a response. Please try again.";
        const errMsgObj = { role: 'assistant' as const, content: errMsg, timestamp: new Date() };
        const updatedWithErr = [...chatMessagesRef.current, errMsgObj];
        chatMessagesRef.current = updatedWithErr;
        setChatMessages(updatedWithErr);
      } else {
        const assistantMsg = { role: 'assistant' as const, content: response.data.response, timestamp: new Date() };
        const updatedWithAssistant = [...chatMessagesRef.current, assistantMsg];
        chatMessagesRef.current = updatedWithAssistant;
        setChatMessages(updatedWithAssistant);
        if (sessionId) {
          await supabase.rpc('update_chat_session', {
            p_session_id: sessionId,
            p_messages: updatedWithAssistant.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString() })),
            p_message_count: updatedWithAssistant.length,
          });
        }
      }
    } catch {
      const errMsgObj = { role: 'assistant' as const, content: 'Something went wrong. Please try again.', timestamp: new Date() };
      const updatedWithErr = [...chatMessagesRef.current, errMsgObj];
      chatMessagesRef.current = updatedWithErr;
      setChatMessages(updatedWithErr);
    }
    setChatLoading(false);
  }, [chatInput, chatLoading, selected, chatSessionId, user, profile]);

  // Chart data for bar chart
  const chartData = useMemo(() => {
    if (!isSliderInstrument && !(!isAIRSA && !isSliderInstrument)) return [];
    return sortedDimensions.map(([name, score]) => ({
      name: dimensionNameMap.get(name) ?? formatDimensionName(name),
      dimensionId: name,
      value: score.mean ?? score.level_mean ?? 0,
      band: score.band ?? "moderate",
    }));
  }, [sortedDimensions, isSliderInstrument, isAIRSA, dimensionNameMap]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!assessments.length) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">
          {viewLabel ?? (isCoachView ? "Client Results" : "My Results")}
        </h1>
        <p className="text-muted-foreground">
          {isCoachView ? "No completed assessments found for this client." : "You haven't completed any assessments yet."}
        </p>
        {!isCoachView && (
          <Button onClick={() => navigate("/assessment")}>
            Take an Assessment
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Assessment selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">
          {viewLabel ?? (isCoachView ? "Client Results" : "My Results")}
        </h1>
        {assessments.length > 1 && (
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Select assessment" />
            </SelectTrigger>
            <SelectContent>
              {assessments.map((a) => (
                <SelectItem key={a.result.id} value={a.result.id}>
                  {a.isPTP && a.context_type
                    ? `PTP ${a.context_type.charAt(0).toUpperCase() + a.context_type.slice(1)} — ${format(new Date(a.completed_at!), "MMM yyyy")}`
                    : `${a.instrument_name} — ${format(new Date(a.completed_at!), "MMM yyyy")}`
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selected && (
        <>
          {debriefPendingIds.has(selected.result.assessment_id) && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
                <p className="text-lg font-semibold text-foreground">Results Pending Coach Debrief</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Your coach has asked to review your results with you before they are released.
                  Please connect with your coach to schedule your debrief session.
                </p>
              </CardContent>
            </Card>
          )}
          {!debriefPendingIds.has(selected.result.assessment_id) && (
            <>
          {/* PTP Context Tabs */}
          {showPtpTabs && (
            <section>
              <Tabs value={ptpContextTab ?? 'professional'} onValueChange={(v) => { setPtpContextTab(v as any); setPtpTabOverrideId(null); }}>
                <TabsList>
                  <TabsTrigger value="professional">Professional</TabsTrigger>
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="combined">Combined</TabsTrigger>
                </TabsList>
              </Tabs>
              {ptpContextTab === 'professional' && ptpProfessionalResults.length > 1 && (
                <div className="mt-2">
                  <Select value={ptpTabOverrideId ?? ptpProfessionalResults[0].result.id} onValueChange={setPtpTabOverrideId}>
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ptpProfessionalResults.map(a => (
                        <SelectItem key={a.result.id} value={a.result.id}>
                          Professional — {format(new Date(a.completed_at!), 'MMM yyyy')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {ptpContextTab === 'personal' && ptpPersonalResults.length > 1 && (
                <div className="mt-2">
                  <Select value={ptpTabOverrideId ?? ptpPersonalResults[0].result.id} onValueChange={setPtpTabOverrideId}>
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ptpPersonalResults.map(a => (
                        <SelectItem key={a.result.id} value={a.result.id}>
                          Personal — {format(new Date(a.completed_at!), 'MMM yyyy')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {ptpContextTab === 'combined' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing averaged scores across your most recent Professional and Personal assessments.
                </p>
              )}
            </section>
          )}

          {/* Coach/Client view toggle — only when coach is viewing client's NAI result */}
          {isCoachView && isNAI && (
            <section>
              <Tabs
                value={coachViewActive ? "coach" : "client"}
                onValueChange={(v) => setCoachViewActive(v === "coach")}
              >
                <TabsList>
                  <TabsTrigger value="coach">Coach Report</TabsTrigger>
                  <TabsTrigger value="client">Client Report</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground mt-2">
                {coachViewActive
                  ? "Coach view — includes pattern alert, coaching questions, and C.A.F.E.S.–PTP mapping."
                  : "Client view — shows only what the client sees. PDF export will reflect this view."}
              </p>
            </section>
          )}

          {/* SECTION 1 - Profile Overview */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Your {selected.instrument_name.replace(/\s*Profile$/i, '')} Profile
                {showPtpTabs && ptpContextTab && (
                  <span className="text-muted-foreground font-normal">
                    {' '}— {ptpContextTab === 'professional' ? 'Professional' : ptpContextTab === 'personal' ? 'Personal' : 'Combined'}
                  </span>
                )}
              </h2>
              {displayName && (
                <p className="text-muted-foreground">{displayName}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Taken{" "}
                {format(new Date(selected.completed_at!), "MMMM yyyy")} |
                Version {selected.result.instrument_version ?? "—"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Dimensions Assessed"
                value={String(dimensionScores.length)}
              />
              <StatCard
                label="Highest Dimension"
                value={resolveDimensionName(highestDimension)}
              />
              <StatCard
                label="Lowest Dimension"
                value={resolveDimensionName(lowestDimension)}
              />
            </div>
          </section>

          {/* SECTION 1b - Actions */}
          <section className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setExportModalOpen(true)}
            >
              <FileText className="mr-2 h-4 w-4" /> Export PDF
            </Button>
            {!isCoachView && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(
                      `/assessment?instrument=${selected.result.instrument_id}`
                    )
                  }
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Retake Assessment
                </Button>
                <Button onClick={() => navigate("/assessment")}>
                  Take Another Assessment
                </Button>
              </>
            )}
          </section>

          {/* Complete other half prompt — PTP only */}
          {!isCoachView && selected.isPTP && !hasPtpTabs && (selected.context_type === 'professional' || selected.context_type === 'personal') && (
            <section>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {selected.context_type === 'professional'
                        ? 'Complete your Personal / Social Profile'
                        : 'Complete your Corporate / Professional Profile'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selected.context_type === 'professional'
                        ? 'You completed the professional context. Take the personal half to get your full PTP picture.'
                        : 'You completed the personal context. Take the professional half to get your full PTP picture.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate('/assessment?instrument=INST-001&autostart=true')}
                  >
                    Start Now
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}

          {/* SECTION 2 - Profile Chart */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dimension Scores</CardTitle>
              </CardHeader>
              <CardContent>
                {isAIRSA ? (
                  <AIRSACards dimensions={dimensionScores} />
                ) : effectiveSelected?.isPTP ? (
                  <PTPDomainCards
                    dimensions={dimensionScores}
                    dimensionNameMap={dimensionNameMap}
                  />
                ) : isNAI ? (
                  <NAIDomainCards
                    dimensions={dimensionScores}
                    dimensionNameMap={dimensionNameMap}
                  />
                ) : (
                  <ScrollArea className="w-full">
                    <div
                      style={{
                        minWidth: Math.max(400, sortedDimensions.length * 50),
                        height: Math.max(300, sortedDimensions.length * 44),
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ left: 120, right: 40, top: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis
                            type="number"
                            domain={isSliderInstrument ? [0, 100] : [0, 4]}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={110}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(value: number) => [
                              String(Math.round(value)),
                              "Score",
                            ]}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, idx) => (
                              <Cell
                                key={idx}
                                fill={
                                  effectiveSelected?.isPTP
                                    ? PTP_DIMENSION_COLORS[entry.dimensionId] ?? BAND_COLORS.moderate
                                    : BAND_COLORS[entry.band] ?? BAND_COLORS.moderate
                                }
                              />
                            ))}
                            <LabelList
                              dataKey="value"
                              position="right"
                              formatter={(v: number) => String(Math.round(v))}
                              style={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>

          {/* SECTION 2b - Driving Facet Scores (PTP only) */}
          {effectiveSelected?.isPTP && !isNAI && (
            <section>
              <DrivingFacetScores
                assessmentId={effectiveSelected.result.assessment_id}
                additionalAssessmentId={ptpContextTab === 'combined' && !isBothAssessment && hasPtpTabs ? ptpPersonalResults[0]?.result.assessment_id : undefined}
                contextFilter={isBothAssessment && ptpContextTab !== 'combined' ? ptpContextTab as 'professional' | 'personal' : undefined}
              />
            </section>
          )}

          {/* SECTION 3 - Cross-Instrument Recommendations */}
          {recommendations.length > 0 && (
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Cross-Instrument Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Based on your results, we suggest exploring:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.map((triggerId) => (
                      <Button
                        key={triggerId}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/assessment?instrument=${triggerId}`)
                        }
                      >
                        {triggerId} <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* SECTION 4 - Profile Interpretation */}
          <section>
            {effectiveSelected?.isPTP ? (
              <PTPNarrativeSections
                assessmentResultId={effectiveSelected.result.id}
                assessmentId={effectiveSelected.result.assessment_id}
                narrative={selected.result.ai_narrative}
                dimensionScores={dimensionScores as [string, { mean?: number; band?: string }][]}
                dimensionNameMap={dimensionNameMap}
                recommendations={recommendations}
                permissionLevel={permissionLevel}
                isCoachView={isCoachView}
                ptpContextTab={ptpContextTab}
                otherAssessments={assessments.filter(a => a.result.id !== effectiveSelected?.result.id)}
              />
            ) : isNAI ? (
              <NAINarrativeSections
                assessmentResultId={selected.result.id}
                assessmentId={selected.result.assessment_id}
                dimensionScores={dimensionScores as [string, { mean?: number; band?: string }][]}
                dimensionNameMap={dimensionNameMap}
                isCoachView={coachViewActive}
                permissionLevel={permissionLevel}
                otherAssessments={assessments.filter(a => a.result.id !== selected?.result.id)}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Your Profile Interpretation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isCoachView && permissionLevel === 'score_summary' ? (
                    <p className="text-sm text-muted-foreground">
                      The client has limited coach access to scores only.
                    </p>
                  ) : selected.result.ai_narrative ? (
                    <>
                      <div className="max-w-none text-foreground text-sm">
                        <NarrativeRenderer text={selected.result.ai_narrative} />
                      </div>
                      {selected.result.ai_version && (
                        <p className="text-xs text-gray-500 mt-4">
                          Generated with {selected.result.ai_version}
                        </p>
                      )}
                      {regeneratedVersion && (
                        <p className="text-xs text-accent-foreground bg-accent/10 rounded px-2 py-1 inline-block">
                          Regenerated with {regeneratedVersion}
                        </p>
                      )}
                      {limitReached && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                          <span className="text-muted-foreground">
                            You've used all {limitReached.limit} monthly AI messages.{" "}
                            {limitReached.tier === "base" && (
                              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate("/pricing")}>
                                Upgrade to Premium
                              </Button>
                            )}
                          </span>
                        </div>
                      )}
                      {!isCoachView && (
                        regenerating ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Regenerating interpretation…
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-foreground border-border mt-1"
                              onClick={() => {
                                if (profile?.subscription_status === "active") {
                                  setShowConfirmDialog(true);
                                } else {
                                  setShowUpgradeDialog(true);
                                }
                              }}
                            >
                              <RefreshCw className="mr-1 h-3 w-3" /> Regenerate Interpretation
                            </Button>

                            {/* Upgrade dialog for users without active subscription */}
                            <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Subscription Required</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Regenerating your interpretation requires an active subscription.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex flex-col items-center gap-2 sm:flex-col">
                                  <AlertDialogAction onClick={() => { setShowUpgradeDialog(false); navigate("/pricing"); }}>
                                    Upgrade to Premium
                                  </AlertDialogAction>
                                  <p className="text-xs text-muted-foreground text-center">
                                    Base plan also includes interpretation regeneration.
                                  </p>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            {/* Existing confirmation dialog for active subscribers */}
                            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Regenerate Interpretation?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will regenerate your interpretation using the latest AI version. Your current interpretation will be replaced. This will use 1 of your monthly AI messages. Continue?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleRegenerate}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )
                      )}
                    </>
                  ) : pollingNarrative ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Your personalized interpretation is being generated. This
                      takes about 30 seconds.
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No narrative available for this assessment.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </section>

          {/* Export PDF Modal */}
          <ExportPdfModal
            open={exportModalOpen}
            onOpenChange={setExportModalOpen}
            instrumentType={isNAI ? "NAI" : (effectiveSelected?.isPTP ? "PTP" : "OTHER")}
            isCoachView={coachViewActive}
            onExportPtp={handlePdfExport}
            onExportNai={handleNaiPdfExport}
          />
            </>
          )}
        </>
      )}

      {!isCoachView && selected && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
          {chatOpen && profile?.subscription_status === 'active' && (
            <div className="w-80 sm:w-96 h-[480px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Chat header */}
              <div className="bg-primary px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary-foreground" />
                  <span className="text-sm font-semibold text-primary-foreground">Ask AI</span>
                </div>
                <button onClick={async () => {
                  setChatOpen(false);
                  if (chatSessionId) {
                    await supabase.rpc('close_chat_session', { p_session_id: chatSessionId });
                    setChatSessionId(null);
                  }
                }} className="text-primary-foreground/70 hover:text-primary-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Context note */}
              <div className="px-3 py-2 bg-muted/50 border-b border-border">
                <p className="text-xs text-muted-foreground">
                  Chatting about your <strong>{selected.instrument_name}</strong> results.{' '}
                  <button onClick={() => navigate('/ai-chat')} className="text-primary underline">Multi-assessment chat →</button>
                </p>
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground mt-8 space-y-1">
                    <Brain className="h-8 w-8 text-primary/30 mx-auto" />
                    <p>Ask me anything about your {selected.instrument_name} results.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      {msg.role === 'assistant' ? (
                        <div className="space-y-1">
                          {msg.content.split('\n').map((line, li) => {
                            const t = line.trim();
                            if (!t) return null;
                            if (t.startsWith('### ')) return <p key={li} className="font-semibold text-primary">{renderInlineMarkdown(t.replace(/^###\s*/, ''))}</p>;
                            if (t.startsWith('## ')) return <p key={li} className="font-semibold text-primary">{renderInlineMarkdown(t.replace(/^##\s*/, ''))}</p>;
                            if (t.startsWith('# ')) return <p key={li} className="font-semibold text-primary">{renderInlineMarkdown(t.replace(/^#\s*/, ''))}</p>;
                            const bulletMatch = t.match(/^[-*]\s+(.+)$/);
                            if (bulletMatch) return (
                              <div key={li} className="flex items-start gap-1.5">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/50 shrink-0" />
                                <span>{renderInlineMarkdown(bulletMatch[1])}</span>
                              </div>
                            );
                            return <p key={li}>{renderInlineMarkdown(t)}</p>;
                          })}
                        </div>
                      ) : renderInlineMarkdown(msg.content)}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{animationDelay:'0ms'}} />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{animationDelay:'150ms'}} />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{animationDelay:'300ms'}} />
                    </div>
                  </div>
                )}
              </div>
              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2">
                <input
                  className="flex-1 text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ask about your results..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Bubble toggle button */}
          <button
            onClick={() => {
              if (profile?.subscription_status !== 'active') {
                setShowChatUpgradeDialog(true);
              } else {
                setChatOpen(prev => !prev);
              }
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-3 shadow-lg hover:bg-primary/90 transition-all"
          >
            <Brain className="h-5 w-5" />
            <span className="text-sm font-semibold">Ask AI</span>
          </button>

          {/* Upgrade dialog for non-subscribers */}
          <AlertDialog open={showChatUpgradeDialog} onOpenChange={setShowChatUpgradeDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Subscription Required</AlertDialogTitle>
                <AlertDialogDescription>
                  AI chat requires an active subscription. Upgrade to Base or higher to start chatting about your results.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col items-center gap-2 sm:flex-col">
                <AlertDialogAction onClick={() => { setShowChatUpgradeDialog(false); navigate('/pricing'); }}>
                  Upgrade to Premium
                </AlertDialogAction>
                <p className="text-xs text-muted-foreground text-center">Base plan also includes AI chat.</p>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function AIRSACards({
  dimensions,
}: {
  dimensions: [string, DimensionScore][];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {dimensions.map(([name, score]) => {
        const level = score.readiness_level ?? "Foundational";
        const colors = READINESS_COLORS[level] ?? READINESS_COLORS.Foundational;
        return (
          <div
            key={name}
            className="rounded-lg p-4 border"
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
            }}
          >
            <p className="text-sm font-medium" style={{ color: colors.text }}>
              {formatDimensionName(name)}
            </p>
            <Badge
              className="mt-2"
              style={{
                backgroundColor: colors.border,
                color: "#fff",
              }}
            >
              {level}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

function NarrativeRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let paragraphBuffer: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    elements.push(
      <p key={key++} className="mb-4 leading-relaxed text-foreground">
        {paragraphBuffer.map((line, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {renderInlineMarkdown(line)}
          </span>
        ))}
      </p>
    );
    paragraphBuffer = [];
  };

  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();

    // Empty line → flush paragraph
    if (trimmed === "") {
      flushParagraph();
      continue;
    }

    // ## Heading
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      elements.push(
        <h3
          key={key++}
          className="text-lg font-bold mt-8 mb-3 pb-1 border-b"
          style={{ color: "hsl(var(--primary))", borderColor: "hsl(var(--primary) / 0.2)" }}
        >
          {renderInlineMarkdown(trimmed.replace(/^##\s*/, ""))}
        </h3>
      );
      continue;
    }

    // ### Subheading (facet name etc.)
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      elements.push(
        <h4
          key={key++}
          className="text-base font-semibold mt-8 mb-2 pt-4 border-t border-border/40 first:border-t-0 first:pt-0 first:mt-5"
          style={{ color: "hsl(var(--primary))" }}
        >
          {renderInlineMarkdown(trimmed.replace(/^###\s*/, ""))}
        </h4>
      );
      continue;
    }

    // Labeled subsection: "Impact on Self:" / "Impact on Others:"
    const labelMatch = trimmed.match(/^\*\*(.+?:)\*\*$/);
    if (labelMatch) {
      flushParagraph();
      const labelText = labelMatch[1];
      const isImpactOnOthers = /impact on others/i.test(labelText);
      elements.push(
        <p key={key++} className={`text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide ${isImpactOnOthers ? "mt-5" : "mt-2"}`}>
          {labelText}
        </p>
      );
      continue;
    }

    // Bullet lines: - text, * text, or emoji-prefixed (✅ ❌)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const emojiMatch = trimmed.match(/^(✅|❌)\s*(.+)$/);

    if (bulletMatch || emojiMatch) {
      flushParagraph();
      const content = bulletMatch ? bulletMatch[1] : trimmed;
      elements.push(
        <div key={key++} className="flex items-start gap-2 mb-3 ml-2">
          {bulletMatch && !emojiMatch && (
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          )}
          <span className="text-foreground leading-relaxed">
            {renderInlineMarkdown(content)}
          </span>
        </div>
      );
      continue;
    }

    // Regular text → accumulate into paragraph
    paragraphBuffer.push(trimmed);
  }

  flushParagraph();

  return <div className="space-y-0">{elements}</div>;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Strip heading markers (# ## ###) at start of line
  const stripped = text.replace(/^#{1,3}\s+/, '');

  // Split on **bold**, *italic*, and `code` markers
  const parts = stripped.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function PTPDomainCards({
  dimensions,
  dimensionNameMap,
}: {
  dimensions: [string, DimensionScore][];
  dimensionNameMap: Map<string, string>;
}) {
  const getBand = (score: number) => {
    if (score >= 70) return "High";
    if (score >= 40) return "Moderate";
    return "Low";
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {dimensions.map(([dimId, score]) => {
        const mean = Math.round(score.mean ?? score.level_mean ?? 0);
        const color = PTP_DIMENSION_COLORS[dimId] ?? "#021F36";
        const pastel = PTP_DIMENSION_PASTEL[dimId] ?? "#F9F7F1";
        const name = dimensionNameMap.get(dimId) ?? PTP_DIMENSION_NAMES[dimId] ?? formatDimensionName(dimId);
        const band = getBand(mean);
        return (
          <div
            key={dimId}
            className="rounded-xl p-4 flex flex-col items-center text-center space-y-2 border"
            style={{ backgroundColor: pastel, borderColor: color + "40" }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <p className="text-sm font-semibold text-foreground leading-tight">{name}</p>
            <p
              className="text-3xl font-bold"
              style={{ color }}
            >
              {mean}
            </p>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: color + "20", color }}
            >
              {band}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function NAIDomainCards({
  dimensions,
  dimensionNameMap,
}: {
  dimensions: [string, DimensionScore][];
  dimensionNameMap: Map<string, string>;
}) {
  const getBand = (score: number) => {
    if (score >= 76) return "High";
    if (score >= 51) return "Elevated";
    if (score >= 26) return "Moderate";
    return "Low";
  };

  const NAI_NAMES: Record<string, string> = {
    "DIM-NAI-01": "Certainty",
    "DIM-NAI-02": "Agency",
    "DIM-NAI-03": "Fairness",
    "DIM-NAI-04": "Ego Stability",
    "DIM-NAI-05": "Saturation Threshold",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {dimensions.map(([dimId, score]) => {
        const mean = Math.round(score.mean ?? score.level_mean ?? 0);
        const color = NAI_DIMENSION_COLORS[dimId] ?? "#021F36";
        const pastel = NAI_DIMENSION_PASTEL[dimId] ?? "#F9F7F1";
        const name = dimensionNameMap.get(dimId) ?? NAI_NAMES[dimId] ?? formatDimensionName(dimId);
        const band = getBand(mean);
        return (
          <div
            key={dimId}
            className="rounded-xl p-4 flex flex-col items-center text-center space-y-2 border"
            style={{ backgroundColor: pastel, borderColor: color + "40" }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <p className="text-sm font-semibold text-foreground leading-tight">{name}</p>
            <p
              className="text-3xl font-bold"
              style={{ color }}
            >
              {mean}
            </p>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: color + "20", color }}
            >
              {band}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatDimensionName(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
