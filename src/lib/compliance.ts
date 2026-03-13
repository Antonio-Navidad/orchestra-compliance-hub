import { Shipment, Invoice, Manifest, ComparisonMismatch } from "@/types/orchestra";

// ── Severity type used across all risk/status systems ──
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'safe';

// ── Score → severity ──
export function getRiskLevel(score: number): RiskSeverity {
  if (score >= 85) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'safe';
}

// ── Status → severity (single source of truth for all status colors) ──
export function getStatusSeverity(status: string): RiskSeverity {
  const map: Record<string, RiskSeverity> = {
    // Critical (red)
    customs_hold: 'critical',
    flagged: 'critical',
    escalated: 'critical',
    closed_incident: 'critical',
    blocked: 'critical',
    exception: 'critical',
    failed: 'critical',
    exhausted: 'critical',
    rejected: 'critical',
    // High / warning (orange)
    waiting_docs: 'high',
    in_review: 'high',
    incomplete: 'high',
    inconsistent: 'high',
    caution: 'high',
    stale: 'high',
    retrying: 'high',
    revision_requested: 'high',
    delayed: 'high',
    // Medium (yellow)
    pending: 'medium',
    draft: 'medium',
    queued: 'medium',
    pending_inputs: 'medium',
    checking: 'medium',
    extracting: 'medium',
    validating: 'medium',
    running: 'medium',
    awaiting_approval: 'medium',
    // Safe (green)
    cleared: 'safe',
    corrected: 'safe',
    closed_avoided: 'safe',
    delivered: 'safe',
    approved: 'safe',
    ready: 'safe',
    extracted: 'safe',
    sent: 'safe',
    // Low / neutral (teal-green)
    new: 'low',
    in_transit: 'low',
    sent_to_broker: 'low',
    filed: 'low',
    uploaded: 'low',
    evaluated: 'low',
    at_checkpoint: 'low',
    not_checked: 'low',
    not_run: 'low',
  };
  return map[status] || 'low';
}

// ── Semantic Tailwind class maps (all use design tokens from index.css) ──
const SEVERITY_TEXT: Record<RiskSeverity, string> = {
  critical: 'text-risk-critical',
  high: 'text-risk-high',
  medium: 'text-risk-medium',
  low: 'text-risk-safe',
  safe: 'text-risk-safe',
};

const SEVERITY_BG: Record<RiskSeverity, string> = {
  critical: 'bg-risk-critical',
  high: 'bg-risk-high',
  medium: 'bg-risk-medium',
  low: 'bg-risk-safe',
  safe: 'bg-risk-safe',
};

const SEVERITY_BADGE: Record<RiskSeverity, string> = {
  critical: 'bg-risk-critical/20 text-risk-critical border-risk-critical/30',
  high: 'bg-risk-high/20 text-risk-high border-risk-high/30',
  medium: 'bg-risk-medium/20 text-risk-medium border-risk-medium/30',
  low: 'bg-risk-safe/20 text-risk-safe border-risk-safe/30',
  safe: 'bg-risk-safe/20 text-risk-safe border-risk-safe/30',
};

const SEVERITY_BORDER: Record<RiskSeverity, string> = {
  critical: 'border-l-risk-critical',
  high: 'border-l-risk-high',
  medium: 'border-l-risk-medium',
  low: 'border-l-risk-safe',
  safe: 'border-l-risk-safe',
};

// ── Public helpers: pass a score OR a status string ──
export function getRiskColor(score: number): string {
  return SEVERITY_TEXT[getRiskLevel(score)];
}

export function getRiskTextClass(severity: RiskSeverity): string {
  return SEVERITY_TEXT[severity];
}

export function getRiskBgClass(severity: RiskSeverity): string {
  return SEVERITY_BG[severity];
}

export function getRiskBadgeClass(severity: RiskSeverity): string {
  return SEVERITY_BADGE[severity];
}

export function getRiskBorderClass(severity: RiskSeverity): string {
  return SEVERITY_BORDER[severity];
}

// Convenience: score-based helpers
export function getScoreBadgeClass(score: number): string {
  return SEVERITY_BADGE[getRiskLevel(score)];
}

export function getScoreBorderClass(score: number): string {
  return SEVERITY_BORDER[getRiskLevel(score)];
}

export function getScoreBgClass(score: number): string {
  return SEVERITY_BG[getRiskLevel(score)];
}

// Convenience: status-based helpers
export function getStatusBadgeClass(status: string): string {
  return SEVERITY_BADGE[getStatusSeverity(status)];
}

export function getStatusTextClass(status: string): string {
  return SEVERITY_TEXT[getStatusSeverity(status)];
}

export function getRiskLabel(score: number): string {
  const level = getRiskLevel(score);
  const map: Record<string, string> = {
    critical: 'CRITICAL',
    high: 'HIGH RISK',
    medium: 'HOLD RISK',
    low: 'LOW',
    safe: 'SAFE',
  };
  return map[level] || 'UNKNOWN';
}

export function compareInvoiceManifest(invoice: Invoice, manifest: Manifest): ComparisonMismatch[] {
  const mismatches: ComparisonMismatch[] = [];

  if (invoice.quantity !== manifest.quantity) {
    mismatches.push({
      field: 'Quantity',
      invoice_value: invoice.quantity,
      manifest_value: manifest.quantity,
      severity: 'critical',
    });
  }

  if (invoice.hs_code !== manifest.hs_code) {
    mismatches.push({
      field: 'HS Code',
      invoice_value: invoice.hs_code,
      manifest_value: manifest.hs_code,
      severity: 'critical',
    });
  }

  if (Math.abs(invoice.net_weight_kg - manifest.net_weight_kg) > 10) {
    mismatches.push({
      field: 'Net Weight (kg)',
      invoice_value: invoice.net_weight_kg,
      manifest_value: manifest.net_weight_kg,
      severity: Math.abs(invoice.net_weight_kg - manifest.net_weight_kg) > 500 ? 'critical' : 'warning',
    });
  }

  if (Math.abs(invoice.gross_weight_kg - manifest.gross_weight_kg) > 10) {
    mismatches.push({
      field: 'Gross Weight (kg)',
      invoice_value: invoice.gross_weight_kg,
      manifest_value: manifest.gross_weight_kg,
      severity: Math.abs(invoice.gross_weight_kg - manifest.gross_weight_kg) > 500 ? 'critical' : 'warning',
    });
  }

  if (invoice.total_value !== manifest.total_value) {
    mismatches.push({
      field: 'Total Value',
      invoice_value: `$${invoice.total_value.toLocaleString()}`,
      manifest_value: `$${manifest.total_value.toLocaleString()}`,
      severity: 'warning',
    });
  }

  return mismatches;
}

export function getModeComplianceChecks(mode: string): { label: string; priority: 'high' | 'medium' | 'low' }[] {
  switch (mode) {
    case 'air':
      return [
        { label: 'IATA DG Safety Declaration', priority: 'high' },
        { label: 'Air Waybill Verification', priority: 'high' },
        { label: 'Export License Check (BIS/EAR)', priority: 'high' },
        { label: 'Lithium Battery Compliance', priority: 'medium' },
        { label: 'TSA Known Shipper Status', priority: 'medium' },
      ];
    case 'sea':
      return [
        { label: 'Demurrage & Detention Countdown', priority: 'high' },
        { label: 'Bill of Lading Verification', priority: 'high' },
        { label: 'Container Weight (VGM) Check', priority: 'high' },
        { label: 'ISF 10+2 Filing Status', priority: 'medium' },
        { label: 'CBAM Emissions Certificate', priority: 'medium' },
      ];
    case 'land':
      return [
        { label: 'USMCA Certificate of Origin', priority: 'high' },
        { label: 'Border Crossing Documentation', priority: 'high' },
        { label: 'CBAM Carbon Tax Certificate', priority: 'high' },
        { label: 'C-TPAT Compliance Status', priority: 'medium' },
        { label: 'ACE Entry Summary', priority: 'medium' },
      ];
    default:
      return [];
  }
}
