/**
 * Direction-specific issue framing engine.
 * One shared taxonomy, three presentation layers.
 */

export type IssueType =
  | 'missing_document'
  | 'document_mismatch'
  | 'low_confidence_hs'
  | 'valuation_anomaly'
  | 'permit_license_gap'
  | 'consignee_shipper_inconsistency'
  | 'origin_support_issue'
  | 'broker_responsiveness'
  | 'coo_missing'
  | 'export_control_risk';

export type DirectionContext = 'inbound' | 'outbound' | 'combined';

interface IssueFrame {
  label: string;
  explanation: string;
  impact: string;
  action: string;
}

const ISSUE_FRAMES: Record<IssueType, Record<DirectionContext, IssueFrame>> = {
  missing_document: {
    inbound: {
      label: 'Import clearance risk',
      explanation: 'Missing document may delay customs entry or broker filing.',
      impact: 'Potential hold, demurrage, or penalty at destination.',
      action: 'Request document from supplier or forwarder.',
    },
    outbound: {
      label: 'Pre-departure documentation gap',
      explanation: 'Missing document may prevent broker handoff or destination acceptance.',
      impact: 'Shipment may be blocked from departure or rejected at destination.',
      action: 'Obtain document before releasing shipment.',
    },
    combined: {
      label: 'Cross-border documentation gap',
      explanation: 'Missing document affecting shipment readiness and downstream clearance.',
      impact: 'Operational disruption across the supply chain.',
      action: 'Identify responsible party and request document.',
    },
  },
  document_mismatch: {
    inbound: {
      label: 'Customs entry readiness issue',
      explanation: 'Document inconsistency may trigger customs scrutiny or hold.',
      impact: 'Delay at destination port, correction costs.',
      action: 'Resolve discrepancy before broker filing.',
    },
    outbound: {
      label: 'Export packet readiness issue',
      explanation: 'Mismatch may cause broker handoff failure or destination rejection.',
      impact: 'Consignee/customer disruption risk.',
      action: 'Correct documents before shipment release.',
    },
    combined: {
      label: 'Shipment readiness issue',
      explanation: 'Document inconsistency detected across shipment packet.',
      impact: 'Clearance delay and correction costs.',
      action: 'Resolve mismatch with responsible party.',
    },
  },
  low_confidence_hs: {
    inbound: {
      label: 'Classification concern',
      explanation: 'HS code confidence is low — customs may reclassify.',
      impact: 'Duty adjustment, penalty, or hold risk.',
      action: 'Review classification with broker.',
    },
    outbound: {
      label: 'Export classification risk',
      explanation: 'Low-confidence HS code may trigger export control review.',
      impact: 'Shipment may be flagged for dual-use check.',
      action: 'Verify classification before departure.',
    },
    combined: {
      label: 'Classification uncertainty',
      explanation: 'HS code confidence below threshold.',
      impact: 'Risk of reclassification or control-list flag.',
      action: 'Review HS code with compliance team.',
    },
  },
  valuation_anomaly: {
    inbound: {
      label: 'Valuation risk',
      explanation: 'Declared value appears inconsistent with market norms.',
      impact: 'Customs may challenge valuation — penalty exposure.',
      action: 'Verify pricing with supplier documentation.',
    },
    outbound: {
      label: 'Export valuation concern',
      explanation: 'Value inconsistency may affect destination customs acceptance.',
      impact: 'Destination-country rejection or audit.',
      action: 'Confirm value with finance and supplier.',
    },
    combined: {
      label: 'Value discrepancy',
      explanation: 'Valuation anomaly detected on shipment.',
      impact: 'Customs challenge risk on either end.',
      action: 'Review declared value against supporting docs.',
    },
  },
  permit_license_gap: {
    inbound: {
      label: 'Import permit gap',
      explanation: 'Required import permit or license not confirmed.',
      impact: 'Goods may be held or seized at destination.',
      action: 'Check compliance requirements and obtain permit.',
    },
    outbound: {
      label: 'Export license gap',
      explanation: 'Required export license or permit not confirmed.',
      impact: 'Shipment cannot legally depart.',
      action: 'Obtain license from competent authority.',
    },
    combined: {
      label: 'Permit/license gap',
      explanation: 'Regulatory permit or license not confirmed.',
      impact: 'Legal and operational hold risk.',
      action: 'Identify requirement and obtain authorization.',
    },
  },
  consignee_shipper_inconsistency: {
    inbound: {
      label: 'Consignee verification issue',
      explanation: 'Consignee details inconsistent across documents.',
      impact: 'Customs may reject entry or request clarification.',
      action: 'Align consignee details across all documents.',
    },
    outbound: {
      label: 'Shipper/consignee mismatch',
      explanation: 'Party details do not match across export packet.',
      impact: 'Broker handoff failure or destination rejection.',
      action: 'Correct party information before release.',
    },
    combined: {
      label: 'Party inconsistency',
      explanation: 'Shipper or consignee details mismatched across documents.',
      impact: 'Clearance and compliance risk.',
      action: 'Resolve with originating party.',
    },
  },
  origin_support_issue: {
    inbound: {
      label: 'Origin verification risk',
      explanation: 'Origin claim not supported — may lose preferential treatment.',
      impact: 'Higher duties or customs challenge.',
      action: 'Obtain COO or origin supporting documentation.',
    },
    outbound: {
      label: 'Origin documentation gap',
      explanation: 'Missing COO may delay broker handoff or destination acceptance.',
      impact: 'Destination-country preferential treatment denied.',
      action: 'Request COO from supplier before departure.',
    },
    combined: {
      label: 'Cross-border origin gap',
      explanation: 'Origin support documentation missing or insufficient.',
      impact: 'Duty and clearance timing impact.',
      action: 'Obtain origin documentation.',
    },
  },
  broker_responsiveness: {
    inbound: {
      label: 'Broker filing delay risk',
      explanation: 'Broker has not responded within SLA.',
      impact: 'Entry filing may be delayed — hold risk increases.',
      action: 'Escalate to backup contact or manager.',
    },
    outbound: {
      label: 'Broker handoff delay',
      explanation: 'Forwarder/broker not responding to document handoff.',
      impact: 'Departure may be delayed.',
      action: 'Escalate to backup contact.',
    },
    combined: {
      label: 'Broker responsiveness issue',
      explanation: 'Broker/forwarder response time exceeds SLA.',
      impact: 'Operational delay risk.',
      action: 'Escalate via escalation panel.',
    },
  },
  coo_missing: {
    inbound: {
      label: 'Import clearance risk: missing COO',
      explanation: 'Missing COO may delay customs entry or origin verification.',
      impact: 'Hold risk, duty adjustment.',
      action: 'Request COO from supplier.',
    },
    outbound: {
      label: 'Pre-departure gap: missing COO',
      explanation: 'Missing COO may delay broker handoff or destination acceptance.',
      impact: 'Destination-country rejection risk.',
      action: 'Obtain COO before releasing shipment.',
    },
    combined: {
      label: 'Documentation gap: missing COO',
      explanation: 'Missing COO affecting readiness and downstream clearance.',
      impact: 'Cross-border clearance delay.',
      action: 'Identify source and request COO.',
    },
  },
  export_control_risk: {
    inbound: {
      label: 'Import control concern',
      explanation: 'Commodity may require import-side regulatory review.',
      impact: 'Seizure or denial of entry.',
      action: 'Review with compliance team.',
    },
    outbound: {
      label: 'Export control / dual-use risk',
      explanation: 'Commodity may be subject to export controls.',
      impact: 'Shipment must not depart without authorization.',
      action: 'Dual-use check required before release.',
    },
    combined: {
      label: 'Regulatory control risk',
      explanation: 'Commodity flagged for potential regulatory restrictions.',
      impact: 'Legal and compliance exposure.',
      action: 'Engage compliance team immediately.',
    },
  },
};

export function getIssueFrame(issueType: IssueType, context: DirectionContext): IssueFrame {
  return ISSUE_FRAMES[issueType]?.[context] || ISSUE_FRAMES[issueType]?.combined;
}

export function detectShipmentIssues(shipment: {
  risk_score: number;
  status: string;
  coo_status?: string;
  packet_score?: number;
  filing_readiness?: string;
  hs_code?: string;
  declared_value?: number;
  assigned_broker?: string;
}): IssueType[] {
  const issues: IssueType[] = [];

  if (shipment.coo_status === 'pending' || shipment.coo_status === 'unknown') {
    issues.push('coo_missing');
  }
  if ((shipment.packet_score ?? 100) < 50) {
    issues.push('missing_document');
  }
  if (shipment.risk_score >= 70) {
    issues.push('valuation_anomaly');
  }
  if (shipment.risk_score >= 85) {
    issues.push('export_control_risk');
  }
  if (shipment.filing_readiness === 'not_ready') {
    issues.push('document_mismatch');
  }

  return issues;
}
