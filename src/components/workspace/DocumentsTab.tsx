import { useState, useCallback, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScoreBanner } from "./ScoreBanner";
import { DocumentCard, type DocumentCardData, type DocCardState } from "./DocumentCard";
import { AlertDrawer } from "./AlertDrawer";
import { useDocExtraction } from "@/hooks/useDocExtraction";
import { getDrawerContent, getScorePillDrawer, type AlertDrawerData } from "@/lib/alertDrawerContent";
import type { ShipmentModeId } from "@/lib/shipmentModes";
import { getModeDocumentConfig } from "@/lib/modeDocumentDefs";

interface DocumentsTabProps {
  shipmentMode: ShipmentModeId;
  uploadedDocTypes: string[];
  commodityType: string;
  originCountry: string;
  incoterm: string;
  declaredValue: string;
  hsCode: string;
  shipmentSubtitle: string;
  shipmentId: string;
  deadlines?: import('@/lib/deadlineEngine').ShipmentDeadline[];
  onClickDeadline?: (d: import('@/lib/deadlineEngine').ShipmentDeadline) => void;
  onViewAIAnalysis?: () => void;
  onUploadDoc?: (docId: string, files: FileList) => void;
  onOpenPacketIntake?: () => void;
}

function calcFees(declaredValue: string, mode: ShipmentModeId): Record<string, string> {
  const isExport = ['ocean_export', 'air_export', 'land_export_mexico', 'land_export_canada', 'us_export'].includes(mode);
  if (isExport) {
    return { no_export_fees: 'No MPF or HMF applies to U.S. exports' };
  }

  const val = parseFloat(declaredValue) || 0;
  const isOcean = mode === 'ocean_import';
  const isCanada = mode === 'land_import_canada';
  const mpf = Math.min(Math.max(val * 0.003464, 31.67), 614.35);
  const hmf = val * 0.00125;

  return {
    mpf_calc: isCanada
      ? 'Exempt under USMCA for qualifying goods'
      : `$${mpf.toFixed(2)} (0.3464% of $${val.toLocaleString()}, min $31.67, max $614.35)`,
    hmf_calc: isOcean ? `$${hmf.toFixed(2)} (0.125% of $${val.toLocaleString()})` : 'N/A — Ocean only',
    estimated_duties: val > 0 ? 'Calculated per HTS code × declared value' : 'Enter declared value to calculate',
    no_export_fees: 'No MPF or HMF applies to U.S. exports',
  };
}

export function DocumentsTab({
  shipmentMode, uploadedDocTypes, commodityType, originCountry, incoterm,
  declaredValue, hsCode, shipmentSubtitle, shipmentId, deadlines = [], onClickDeadline, onViewAIAnalysis, onUploadDoc, onOpenPacketIntake,
}: DocumentsTabProps) {
  const [showOptional, setShowOptional] = useState(false);
  const [markedNA, setMarkedNA] = useState<Set<string>>(new Set());
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);
  const [alertDrawerData, setAlertDrawerData] = useState<AlertDrawerData | null>(null);

  const {
    extractDocument, processingDocs, getCardEnhancements, getScore, uploadedFiles, crossRefResults,
  } = useDocExtraction({
    shipmentMode,
    commodityType,
    countryOfOrigin: originCountry,
    shipmentId: shipmentId || 'draft',
  });

  // ─── Mode-specific phases and document definitions ───
  const { phases: PHASES, docs: ALL_DOCS } = useMemo(
    () => getModeDocumentConfig(shipmentMode, originCountry),
    [shipmentMode, originCountry],
  );

  const fees = calcFees(declaredValue, shipmentMode);

  const openAlert = useCallback((alertId: string, context?: { docName?: string; severity?: string; message?: string }) => {
    const drawerData = getDrawerContent(alertId, {
      ...context,
      shipmentMode,
      originCountry,
      destCountry: 'United States',
      declaredValue,
      hsCode,
    });
    setAlertDrawerData(drawerData);
    setAlertDrawerOpen(true);
  }, [shipmentMode, originCountry, declaredValue, hsCode]);

  const handleDocUpload = useCallback((docId: string, files: FileList) => {
    const file = files[0];
    if (!file) return;
    onUploadDoc?.(docId, files);
    extractDocument(docId, file);
  }, [onUploadDoc, extractDocument]);

  // Map deadline types to document IDs
  const DEADLINE_DOC_MAP: Record<string, string> = {
    isf_filing: 'isf_filing',
    entry_summary_7501: 'entry_summary_7501',
    fta_expiry: 'fta_certificate',
    bond_renewal: 'customs_bond',
  };

  const deadlineByDocId: Record<string, typeof deadlines[0]> = {};
  for (const d of deadlines) {
    const docId = DEADLINE_DOC_MAP[d.type];
    if (docId) deadlineByDocId[docId] = d;
  }

  // ─── Build document cards ───
  const allCards: DocumentCardData[] = [];
  let totalRequired = 0;
  let verified = 0;
  let issuesFlagged = 0;
  let missing = 0;

  for (const [docId, def] of Object.entries(ALL_DOCS)) {
    if (markedNA.has(docId)) {
      allCards.push({ id: docId, name: def.name, phase: def.phase, state: 'not_applicable', statusLine: 'Marked as not applicable' });
      continue;
    }

    // PGA docs: check commodity triggers
    if (def.commodityTriggers) {
      const lowerCommodity = commodityType.toLowerCase();
      const matches = def.commodityTriggers.some(t => lowerCommodity.includes(t));
      if (!matches && !showOptional) continue;
      if (!matches) {
        allCards.push({ id: docId, name: def.name, phase: def.phase, state: 'not_applicable', statusLine: 'Not required for this commodity type' });
        continue;
      }
    }

    const enhancements = getCardEnhancements(docId);
    const isProcessing = processingDocs.has(docId);
    const hasUpload = uploadedDocTypes.includes(docId) || !!uploadedFiles[docId];

    let state: DocCardState;
    let statusLine: string;

    if (isProcessing) {
      state = 'processing';
      statusLine = 'Processing with AI — extracting data...';
      totalRequired++;
    } else if (def.autoCalc) {
      state = 'verified';
      statusLine = def.statusOverride || fees[docId] || 'Auto-calculated';
    } else if (hasUpload && enhancements.state) {
      state = enhancements.state;
      statusLine = enhancements.statusLine || 'Uploaded · AI verified';
      if (state === 'verified') verified++;
      if (state === 'issue') issuesFlagged++;
      totalRequired++;
    } else if (hasUpload) {
      state = 'verified';
      statusLine = 'Uploaded · Awaiting AI verification';
      verified++;
      totalRequired++;
    } else if (def.conditional) {
      state = 'missing';
      statusLine = def.statusOverride || 'Conditional — may be required';
      missing++;
      totalRequired++;
    } else {
      state = 'missing';
      statusLine = def.statusOverride || 'Required — not yet uploaded';
      missing++;
      totalRequired++;
    }

    // Append deadline countdown to status line
    const dl = deadlineByDocId[docId];
    if (dl && (dl.status === 'overdue' || dl.status === 'urgent' || dl.status === 'due_soon')) {
      const dlText = dl.status === 'overdue'
        ? ` · ⚠ OVERDUE ${Math.abs(dl.daysRemaining)}d`
        : dl.hoursRemaining < 48
          ? ` · ⏰ Due in ${dl.hoursRemaining}h`
          : ` · ⏰ Due in ${dl.daysRemaining}d`;
      statusLine += dlText;
    }

    allCards.push({
      id: docId,
      name: def.name,
      phase: def.phase,
      state,
      statusLine,
      fileName: uploadedFiles[docId]?.name,
      extractedFields: enhancements.extractedFields,
      crossRefChecks: enhancements.crossRefChecks,
      discrepancies: enhancements.discrepancies,
      notes: enhancements.notes,
    });
  }

  const aiScore = getScore(totalRequired, Object.keys(uploadedFiles));
  const score = aiScore > 0 ? aiScore : (totalRequired > 0 ? Math.round((verified / totalRequired) * 100) : 0);

  // Build status pills
  const statusPills: Array<{ label: string; type: 'green' | 'amber' | 'red'; onClick?: () => void }> = [];
  if (verified > 0) {
    statusPills.push({
      label: `${verified} verified`,
      type: 'green',
      onClick: () => { setAlertDrawerData(getScorePillDrawer('verified', verified)); setAlertDrawerOpen(true); },
    });
  }
  if (issuesFlagged > 0) {
    statusPills.push({
      label: `${issuesFlagged} issues`,
      type: 'amber',
      onClick: () => { setAlertDrawerData(getScorePillDrawer('issues', issuesFlagged)); setAlertDrawerOpen(true); },
    });
  }
  if (missing > 0) {
    statusPills.push({
      label: `${missing} missing`,
      type: 'red',
      onClick: () => { setAlertDrawerData(getScorePillDrawer('missing', missing)); setAlertDrawerOpen(true); },
    });
  }

  const criticalCrossRef = crossRefResults.filter(cr => cr.severity === 'critical').length;
  if (criticalCrossRef > 0) {
    statusPills.push({
      label: `${criticalCrossRef} critical discrepancy`,
      type: 'red',
      onClick: () => { setAlertDrawerData(getScorePillDrawer('critical_discrepancy', criticalCrossRef)); setAlertDrawerOpen(true); },
    });
  }

  return (
    <div className="space-y-4">
      {/* Smart Packet Intake button */}
      {onOpenPacketIntake && (
        <button
          onClick={onOpenPacketIntake}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all text-sm font-semibold text-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Smart Packet Intake — Drop all documents at once
        </button>
      )}
      <ScoreBanner
        score={score}
        totalRequired={totalRequired}
        verified={verified}
        issuesFlagged={issuesFlagged}
        missing={missing}
        shipmentSubtitle={shipmentSubtitle}
        statusPills={statusPills}
        onViewAIAnalysis={onViewAIAnalysis}
      />

      {PHASES.map(phase => {
        const phaseCards = allCards.filter(c => c.phase === phase.key);
        const visible = phaseCards.filter(c => c.state !== 'not_applicable' || showOptional);
        if (visible.length === 0) return null;

        return (
          <div key={phase.key} className="space-y-1.5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 pt-2">
              {phase.label}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {visible.map(card => (
                <DocumentCard
                  key={card.id}
                  doc={card}
                  onUpload={handleDocUpload}
                  onMarkNA={(id) => setMarkedNA(prev => new Set(prev).add(id))}
                  onRequestFromSupplier={(id) => openAlert(id, { docName: card.name })}
                  onClickAlert={(id, msg) => openAlert(id, { docName: card.name, message: msg })}
                  onClickCard={(id) => openAlert(id, { docName: card.name, severity: card.state === 'missing' ? 'critical' : card.state === 'issue' ? 'high' : 'info' })}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2 px-1 pt-2 pb-1">
        <Switch id="show-optional" checked={showOptional} onCheckedChange={setShowOptional} />
        <Label htmlFor="show-optional" className="text-[11px] text-muted-foreground cursor-pointer">
          Show all optional & non-applicable documents
        </Label>
      </div>

      <AlertDrawer
        open={alertDrawerOpen}
        onOpenChange={setAlertDrawerOpen}
        data={alertDrawerData}
        onUpload={(docId) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,.jpg,.png,.doc,.docx,.xlsx';
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
              handleDocUpload(docId, files);
              setAlertDrawerOpen(false);
            }
          };
          input.click();
        }}
        onMarkNA={(docId) => {
          setMarkedNA(prev => new Set(prev).add(docId));
        }}
      />
    </div>
  );
}
