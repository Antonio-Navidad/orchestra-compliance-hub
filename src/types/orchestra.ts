export type TransportMode = 'air' | 'sea' | 'land';

export interface Shipment {
  id: string;
  shipment_id: string;
  mode: TransportMode;
  description: string;
  consignee: string;
  hs_code: string;
  declared_value: number;
  risk_score: number;
  risk_notes: string | null;
  status: 'in_transit' | 'customs_hold' | 'cleared' | 'flagged' | 'new' | 'in_review' | 'waiting_docs' | 'sent_to_broker' | 'escalated' | 'corrected' | 'filed' | 'closed_avoided' | 'closed_incident';
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  shipment_id: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  hs_code: string;
  net_weight_kg: number;
  gross_weight_kg: number;
  currency: string;
  exporter_name: string;
  exporter_address: string;
  created_at: string;
}

export interface Manifest {
  id: string;
  shipment_id: string;
  item_description: string;
  quantity: number;
  total_value: number;
  hs_code: string;
  net_weight_kg: number;
  gross_weight_kg: number;
  packages: number;
  bill_of_lading: string | null;
  vessel_voyage: string | null;
  created_at: string;
}

export interface LegalKnowledge {
  id: string;
  title: string;
  jurisdiction: string;
  regulation_body: string;
  hs_codes_affected: string[];
  summary: string;
  full_text: string | null;
  effective_date: string;
  source_url: string | null;
  transport_modes: TransportMode[];
  created_at: string;
  updated_at: string;
}

export interface ComparisonMismatch {
  field: string;
  invoice_value: string | number;
  manifest_value: string | number;
  severity: 'critical' | 'warning' | 'info';
}

export interface AdminSettings {
  id: string;
  system_prompt: string;
  updated_at: string;
  updated_by: string | null;
}
