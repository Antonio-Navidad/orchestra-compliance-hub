import { Shipment, Invoice, Manifest, ComparisonMismatch } from "@/types/orchestra";

export function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' | 'safe' {
  if (score >= 85) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'safe';
}

export function getRiskColor(score: number): string {
  const level = getRiskLevel(score);
  const map: Record<string, string> = {
    critical: 'text-risk-critical',
    high: 'text-risk-high',
    medium: 'text-risk-medium',
    low: 'text-low',
    safe: 'text-risk-safe',
  };
  return map[level] || 'text-muted-foreground';
}

export function getRiskBgClass(score: number): string {
  const level = getRiskLevel(score);
  const map: Record<string, string> = {
    critical: 'risk-gradient-critical',
    high: 'risk-gradient-high',
    medium: 'risk-gradient-medium',
    low: 'risk-gradient-safe',
    safe: 'risk-gradient-safe',
  };
  return map[level] || '';
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
