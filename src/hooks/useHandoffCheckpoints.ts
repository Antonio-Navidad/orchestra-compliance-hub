import { useState, useCallback } from "react";
import { DEMO_CHECKPOINTS, type HandoffCheckpoint, type HandoffStatus, type ConditionStatus } from "@/lib/handoffData";

export function useHandoffCheckpoints(shipmentId?: string) {
  const [checkpoints, setCheckpoints] = useState<HandoffCheckpoint[]>(
    shipmentId ? DEMO_CHECKPOINTS.filter(c => c.shipment_id === shipmentId) : DEMO_CHECKPOINTS
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selected = selectedId ? checkpoints.find(c => c.id === selectedId) ?? null : null;

  const openCheckpoint = useCallback((id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedId(null);
  }, []);

  const updateStatus = useCallback((id: string, status: HandoffStatus) => {
    setCheckpoints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }, []);

  const submitSenderVerification = useCallback((id: string, data: {
    quantity: number; condition: ConditionStatus; notes: string;
  }) => {
    setCheckpoints(prev => prev.map(c => {
      if (c.id !== id) return c;
      return {
        ...c,
        status: 'awaiting_receiver' as HandoffStatus,
        verifications: [...c.verifications, {
          id: crypto.randomUUID(),
          checkpoint_id: id,
          role: 'sender' as const,
          verified_by: c.sender.name,
          quantity_confirmed: data.quantity,
          condition: data.condition,
          quality: 'acceptable',
          notes: data.notes,
          photo_urls: [],
          accepted: true,
          created_at: new Date().toISOString(),
        }],
      };
    }));
  }, []);

  const submitReceiverVerification = useCallback((id: string, data: {
    quantity: number; condition: ConditionStatus; notes: string; accepted: boolean;
  }) => {
    setCheckpoints(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newStatus: HandoffStatus = data.accepted ? 'completed' : 'issue_flagged';
      return {
        ...c,
        status: newStatus,
        quantity_received: data.quantity,
        condition: data.condition,
        incident: !data.accepted,
        verified_at: new Date().toISOString(),
        verifications: [...c.verifications, {
          id: crypto.randomUUID(),
          checkpoint_id: id,
          role: 'receiver' as const,
          verified_by: c.receiver.name,
          quantity_confirmed: data.quantity,
          condition: data.condition,
          quality: data.accepted ? 'acceptable' : 'rejected',
          notes: data.notes,
          photo_urls: [],
          accepted: data.accepted,
          discrepancy_notes: data.accepted ? undefined : data.notes,
          created_at: new Date().toISOString(),
        }],
      };
    }));
  }, []);

  const addCheckpoint = useCallback((cp: Partial<HandoffCheckpoint>) => {
    const newCp: HandoffCheckpoint = {
      id: crypto.randomUUID(),
      shipment_id: shipmentId || 'SH-2026-CONDOR',
      sequence: checkpoints.length + 1,
      name: cp.name || `Checkpoint ${checkpoints.length + 1}`,
      type: cp.type || 'warehouse_transfer',
      lat: cp.lat || 0,
      lng: cp.lng || 0,
      address: cp.address || '',
      planned_arrival: cp.planned_arrival || new Date().toISOString(),
      sender: cp.sender || { name: '', team: '', contact: '' },
      receiver: cp.receiver || { name: '', team: '', contact: '' },
      status: 'pending',
      quantity_expected: cp.quantity_expected || 0,
      condition: 'intact',
      incident: false,
      verifications: [],
      created_at: new Date().toISOString(),
    };
    setCheckpoints(prev => [...prev, newCp]);
    return newCp.id;
  }, [checkpoints.length, shipmentId]);

  const removeCheckpoint = useCallback((id: string) => {
    setCheckpoints(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) closeDrawer();
  }, [selectedId, closeDrawer]);

  const completedCount = checkpoints.filter(c => c.status === 'completed' || c.status === 'verified').length;
  const progress = checkpoints.length > 0 ? (completedCount / checkpoints.length) * 100 : 0;
  const currentCustodian = [...checkpoints].sort((a, b) => b.sequence - a.sequence)
    .find(c => c.status === 'completed')?.receiver.name || checkpoints[0]?.sender.name || 'Unknown';

  return {
    checkpoints,
    selected,
    selectedId,
    drawerOpen,
    openCheckpoint,
    closeDrawer,
    updateStatus,
    submitSenderVerification,
    submitReceiverVerification,
    addCheckpoint,
    removeCheckpoint,
    progress,
    completedCount,
    currentCustodian,
  };
}
