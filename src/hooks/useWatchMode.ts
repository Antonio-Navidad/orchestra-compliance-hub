import { useState, useEffect, useCallback, useRef } from "react";
import { DEMO_SHIPMENTS, simulateTick, type WatchShipment } from "@/lib/watchModeData";

export type SortField = 'risk' | 'eta' | 'delay' | 'mode' | 'priority';
export type StatusFilter = 'all' | 'active' | 'delayed' | 'at_risk' | 'blocked' | 'completed';
export type ModeFilter = 'all' | 'sea' | 'air' | 'land';

export function useWatchMode() {
  const [shipments, setShipments] = useState<WatchShipment[]>(DEMO_SHIPMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('risk');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [simulationActive, setSimulationActive] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulation tick
  useEffect(() => {
    if (!simulationActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setShipments(prev => simulateTick(prev));
    }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [simulationActive]);

  const togglePin = useCallback((id: string) => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s));
  }, []);

  const removeFromWatch = useCallback((id: string) => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, watched: false } : s));
  }, []);

  const addToWatch = useCallback((id: string) => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, watched: true } : s));
  }, []);

  // Filtered + sorted
  const watched = shipments.filter(s => s.watched);
  const filtered = watched.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (modeFilter !== 'all' && s.mode !== modeFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'risk': return b.risk_score - a.risk_score;
      case 'delay': return b.delay_minutes - a.delay_minutes;
      case 'priority': {
        const order = { critical: 0, high: 1, normal: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      }
      case 'eta': return new Date(a.eta_current).getTime() - new Date(b.eta_current).getTime();
      case 'mode': return a.mode.localeCompare(b.mode);
      default: return 0;
    }
  });

  const pinned = sorted.filter(s => s.pinned);
  const needsAttention = sorted.filter(s => s.risk_score >= 60 || s.status === 'blocked' || s.status === 'at_risk');
  const selected = selectedId ? shipments.find(s => s.id === selectedId) ?? null : null;

  return {
    shipments: sorted,
    pinned,
    needsAttention,
    selected,
    selectedId,
    setSelectedId,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
    modeFilter,
    setModeFilter,
    togglePin,
    removeFromWatch,
    addToWatch,
    simulationActive,
    setSimulationActive,
    totalWatched: watched.length,
    totalAlerts: watched.reduce((sum, s) => sum + s.alert_count, 0),
  };
}
