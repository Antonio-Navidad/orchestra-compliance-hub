// Hand-Off Verification data types and demo data

export type CheckpointType =
  | 'factory_release' | 'warehouse_transfer' | 'port_handoff' | 'airport_handoff'
  | 'customs_checkpoint' | 'cross_dock' | 'inland_carrier_transfer' | 'bonded_warehouse'
  | 'distributor_transfer' | 'final_consignee_delivery';

export type HandoffStatus =
  | 'pending' | 'upcoming' | 'awaiting_sender' | 'awaiting_receiver'
  | 'verified' | 'issue_flagged' | 'completed';

export type ConditionStatus =
  | 'intact' | 'minor_damage' | 'major_damage' | 'seal_broken'
  | 'packaging_compromised' | 'temperature_concern' | 'quantity_mismatch'
  | 'wrong_goods_suspected' | 'rejected' | 'accepted_with_notes';

export interface HandoffCheckpoint {
  id: string;
  shipment_id: string;
  route_id?: string;
  sequence: number;
  name: string;
  type: CheckpointType;
  lat: number;
  lng: number;
  address: string;
  planned_arrival: string;
  actual_arrival?: string;
  sender: { name: string; team: string; contact: string };
  receiver: { name: string; team: string; contact: string };
  status: HandoffStatus;
  quantity_expected: number;
  quantity_received?: number;
  condition: ConditionStatus;
  quality_notes?: string;
  incident: boolean;
  incident_type?: string;
  incident_notes?: string;
  verifications: HandoffVerification[];
  created_at: string;
  verified_at?: string;
  next_checkpoint_id?: string;
}

export interface HandoffVerification {
  id: string;
  checkpoint_id: string;
  role: 'sender' | 'receiver';
  verified_by: string;
  quantity_confirmed: number;
  condition: ConditionStatus;
  quality: string;
  notes?: string;
  photo_urls: string[];
  accepted: boolean;
  discrepancy_notes?: string;
  created_at: string;
}

export const CHECKPOINT_TYPE_LABELS: Record<CheckpointType, string> = {
  factory_release: 'Factory Release',
  warehouse_transfer: 'Warehouse Transfer',
  port_handoff: 'Port Hand-Off',
  airport_handoff: 'Airport Hand-Off',
  customs_checkpoint: 'Customs Checkpoint',
  cross_dock: 'Cross-Dock',
  inland_carrier_transfer: 'Inland Carrier',
  bonded_warehouse: 'Bonded Warehouse',
  distributor_transfer: 'Distributor Transfer',
  final_consignee_delivery: 'Final Delivery',
};

export const STATUS_CONFIG: Record<HandoffStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-muted-foreground', bg: 'bg-muted/30 border-border' },
  upcoming: { label: 'Upcoming', color: 'text-primary', bg: 'bg-primary/10 border-primary/30' },
  awaiting_sender: { label: 'Awaiting Sender', color: 'text-[hsl(var(--risk-medium))]', bg: 'bg-[hsl(var(--risk-medium))]/10 border-[hsl(var(--risk-medium))]/30' },
  awaiting_receiver: { label: 'Awaiting Receiver', color: 'text-[hsl(var(--risk-medium))]', bg: 'bg-[hsl(var(--risk-medium))]/10 border-[hsl(var(--risk-medium))]/30' },
  verified: { label: 'Verified', color: 'text-[hsl(var(--risk-safe))]', bg: 'bg-[hsl(var(--risk-safe))]/10 border-[hsl(var(--risk-safe))]/30' },
  issue_flagged: { label: 'Issue Flagged', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
  completed: { label: 'Completed', color: 'text-[hsl(var(--risk-safe))]', bg: 'bg-[hsl(var(--risk-safe))]/10 border-[hsl(var(--risk-safe))]/30' },
};

export const CONDITION_LABELS: Record<ConditionStatus, string> = {
  intact: 'Intact',
  minor_damage: 'Minor Damage',
  major_damage: 'Major Damage',
  seal_broken: 'Seal Broken',
  packaging_compromised: 'Packaging Compromised',
  temperature_concern: 'Temperature Concern',
  quantity_mismatch: 'Quantity Mismatch',
  wrong_goods_suspected: 'Wrong Goods Suspected',
  rejected: 'Rejected',
  accepted_with_notes: 'Accepted w/ Notes',
};

const hours = (h: number) => new Date(Date.now() + h * 3600000).toISOString();

export const DEMO_CHECKPOINTS: HandoffCheckpoint[] = [
  {
    id: 'cp-001', shipment_id: 'SH-2026-CONDOR', sequence: 1,
    name: 'Medellín Factory', type: 'factory_release',
    lat: 6.25, lng: -75.57, address: 'Zona Franca Rionegro, Medellín',
    planned_arrival: hours(-48),
    actual_arrival: hours(-47),
    sender: { name: 'Carlos Restrepo', team: 'MedTex Manufacturing', contact: 'carlos@medtex.co' },
    receiver: { name: 'Adriana Gómez', team: 'Andean Logistics', contact: 'adriana@andeanlog.co' },
    status: 'completed',
    quantity_expected: 120, quantity_received: 120,
    condition: 'intact', incident: false,
    verifications: [
      { id: 'v-001', checkpoint_id: 'cp-001', role: 'sender', verified_by: 'Carlos Restrepo',
        quantity_confirmed: 120, condition: 'intact', quality: 'export_grade', notes: 'All pallets sealed',
        photo_urls: [], accepted: true, created_at: hours(-47) },
      { id: 'v-002', checkpoint_id: 'cp-001', role: 'receiver', verified_by: 'Adriana Gómez',
        quantity_confirmed: 120, condition: 'intact', quality: 'acceptable', notes: 'Received in good condition',
        photo_urls: [], accepted: true, created_at: hours(-46.5) },
    ],
    created_at: hours(-72), verified_at: hours(-46.5),
  },
  {
    id: 'cp-002', shipment_id: 'SH-2026-CONDOR', sequence: 2,
    name: 'Cartagena Port', type: 'port_handoff',
    lat: 10.39, lng: -75.51, address: 'SPRC Terminal, Cartagena',
    planned_arrival: hours(-24),
    actual_arrival: hours(-22),
    sender: { name: 'Adriana Gómez', team: 'Andean Logistics', contact: 'adriana@andeanlog.co' },
    receiver: { name: 'Miguel Torres', team: 'SPRC Port Authority', contact: 'mtorres@sprc.co' },
    status: 'completed',
    quantity_expected: 120, quantity_received: 120,
    condition: 'intact', incident: false,
    verifications: [
      { id: 'v-003', checkpoint_id: 'cp-002', role: 'sender', verified_by: 'Adriana Gómez',
        quantity_confirmed: 120, condition: 'intact', quality: 'acceptable',
        photo_urls: [], accepted: true, created_at: hours(-22) },
      { id: 'v-004', checkpoint_id: 'cp-002', role: 'receiver', verified_by: 'Miguel Torres',
        quantity_confirmed: 120, condition: 'intact', quality: 'acceptable',
        photo_urls: [], accepted: true, created_at: hours(-21) },
    ],
    created_at: hours(-72), verified_at: hours(-21),
    next_checkpoint_id: 'cp-003',
  },
  {
    id: 'cp-003', shipment_id: 'SH-2026-CONDOR', sequence: 3,
    name: 'Panama Canal Transit', type: 'customs_checkpoint',
    lat: 9.08, lng: -79.68, address: 'Colón Free Zone, Panama',
    planned_arrival: hours(6),
    sender: { name: 'Miguel Torres', team: 'SPRC Port Authority', contact: 'mtorres@sprc.co' },
    receiver: { name: 'Roberto Chen', team: 'Panama Canal Authority', contact: 'rchen@acp.gob.pa' },
    status: 'upcoming',
    quantity_expected: 120,
    condition: 'intact', incident: false, verifications: [],
    created_at: hours(-72),
    next_checkpoint_id: 'cp-004',
  },
  {
    id: 'cp-004', shipment_id: 'SH-2026-CONDOR', sequence: 4,
    name: 'Miami Port', type: 'port_handoff',
    lat: 25.76, lng: -80.19, address: 'PortMiami Terminal E',
    planned_arrival: hours(72),
    sender: { name: 'Roberto Chen', team: 'Panama Canal Authority', contact: 'rchen@acp.gob.pa' },
    receiver: { name: 'Sarah Williams', team: 'US Customs & Border', contact: 'swilliams@cbp.gov' },
    status: 'pending',
    quantity_expected: 120,
    condition: 'intact', incident: false, verifications: [],
    created_at: hours(-72),
    next_checkpoint_id: 'cp-005',
  },
  {
    id: 'cp-005', shipment_id: 'SH-2026-CONDOR', sequence: 5,
    name: 'Atlanta Distribution Center', type: 'final_consignee_delivery',
    lat: 33.75, lng: -84.39, address: '1200 Logistics Pkwy, Atlanta GA',
    planned_arrival: hours(120),
    sender: { name: 'Sarah Williams', team: 'US Customs & Border', contact: 'swilliams@cbp.gov' },
    receiver: { name: 'James Patterson', team: 'TechParts USA', contact: 'jpatterson@techparts.com' },
    status: 'pending',
    quantity_expected: 120,
    condition: 'intact', incident: false, verifications: [],
    created_at: hours(-72),
  },
];

// GeoJSON conversion for map rendering
export function checkpointsToGeoJSON(checkpoints: HandoffCheckpoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: checkpoints.map(cp => ({
      type: "Feature" as const,
      properties: {
        id: cp.id,
        name: cp.name,
        type: cp.type,
        status: cp.status,
        sequence: cp.sequence,
        incident: cp.incident,
        type_label: CHECKPOINT_TYPE_LABELS[cp.type],
        status_label: STATUS_CONFIG[cp.status].label,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [cp.lng, cp.lat],
      },
    })),
  };
}

// Custody flow line connecting checkpoints
export function checkpointsToFlowGeoJSON(checkpoints: HandoffCheckpoint[]) {
  const sorted = [...checkpoints].sort((a, b) => a.sequence - b.sequence);
  if (sorted.length < 2) return { type: "FeatureCollection" as const, features: [] };
  return {
    type: "FeatureCollection" as const,
    features: [{
      type: "Feature" as const,
      properties: { type: "custody_flow" },
      geometry: {
        type: "LineString" as const,
        coordinates: sorted.map(cp => [cp.lng, cp.lat]),
      },
    }],
  };
}
