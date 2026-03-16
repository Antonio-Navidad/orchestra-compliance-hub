import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LaneUsageRecord {
  origin: string;
  destination: string;
  mode: string;
  rulesVersion: string | null;
  workflowStage: string | null;
  usageCount: number;
  lastUsed: string;
  dispositions: string[];
}

export type LaneStatus = "template_only" | "validated" | "active_production" | "archived";

export function deriveLaneStatus(usageCount: number, lastUsed: string | null): LaneStatus {
  if (!lastUsed || usageCount === 0) return "template_only";
  const daysSince = (Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24);
  if (usageCount >= 3 && daysSince <= 30) return "active_production";
  if (daysSince > 90) return "archived";
  return "validated";
}

export function useLaneUsage() {
  const [lanes, setLanes] = useState<LaneUsageRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLaneUsage = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("validation_sessions")
        .select("origin_country, destination_country, shipment_mode, notes, created_at, disposition")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Group by origin+destination+mode
      const map = new Map<string, LaneUsageRecord>();
      for (const row of (data || [])) {
        const origin = row.origin_country || "Unknown";
        const dest = row.destination_country || "Unknown";
        const mode = row.shipment_mode || "unknown";

        // Parse audit meta from notes to get rulesVersion/stage
        let rulesVersion: string | null = null;
        let workflowStage: string | null = null;
        try {
          const meta = JSON.parse(row.notes || "{}");
          rulesVersion = meta.rulesVersion || null;
          workflowStage = meta.workflowStage || null;
        } catch { /* ignore */ }

        const key = `${origin}|${dest}|${mode}`;
        const existing = map.get(key);
        if (existing) {
          existing.usageCount++;
          if (row.created_at > existing.lastUsed) existing.lastUsed = row.created_at;
          if (row.disposition && !existing.dispositions.includes(row.disposition)) {
            existing.dispositions.push(row.disposition);
          }
          if (rulesVersion && !existing.rulesVersion) existing.rulesVersion = rulesVersion;
          if (workflowStage && !existing.workflowStage) existing.workflowStage = workflowStage;
        } else {
          map.set(key, {
            origin,
            destination: dest,
            mode,
            rulesVersion,
            workflowStage,
            usageCount: 1,
            lastUsed: row.created_at,
            dispositions: row.disposition ? [row.disposition] : [],
          });
        }
      }

      setLanes(Array.from(map.values()).sort((a, b) => b.usageCount - a.usageCount));
    } catch (e) {
      console.error("Failed to fetch lane usage:", e);
    }
    setLoading(false);
  }, []);

  return { lanes, loading, fetchLaneUsage };
}
