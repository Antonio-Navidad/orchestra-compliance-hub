import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Lane {
  id: string;
  name: string;
  origin: string;
  destination: string;
  mode: string;
  workflow_stage: string | null;
  rules_version: string | null;
  source_type: string;
  status: string;
  usage_count: number;
  last_used: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLaneParams {
  name: string;
  origin: string;
  destination: string;
  mode: string;
  workflow_stage?: string;
  rules_version?: string;
  source_type?: string;
  status?: string;
  notes?: string;
}

export function useLanes() {
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLanes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lanes")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Failed to fetch lanes:", error);
    } else {
      setLanes((data || []) as Lane[]);
    }
    setLoading(false);
  }, []);

  const createLane = useCallback(async (params: CreateLaneParams): Promise<string | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("lanes")
      .insert({
        name: params.name,
        origin: params.origin,
        destination: params.destination,
        mode: params.mode,
        workflow_stage: params.workflow_stage || "pre_shipment",
        rules_version: params.rules_version || null,
        source_type: params.source_type || "manual",
        status: params.status || "template_only",
        notes: params.notes || null,
        created_by: userData?.user?.id || null,
      } as any)
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to create lane");
      console.error(error);
      return null;
    }

    toast.success(`Lane created: ${params.name}`);
    return data?.id || null;
  }, []);

  const incrementUsage = useCallback(async (laneId: string) => {
    await supabase
      .from("lanes")
      .update({ usage_count: lanes.find(l => l.id === laneId)?.usage_count ?? 0 + 1, last_used: new Date().toISOString() } as any)
      .eq("id", laneId);
  }, [lanes]);

  return { lanes, loading, fetchLanes, createLane, incrementUsage };
}
