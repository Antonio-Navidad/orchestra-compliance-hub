import { PacketScoreResult, DocItem, DocStatus } from "@/lib/packetScore";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, HelpCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface PacketScoreCardProps {
  result: PacketScoreResult;
  compact?: boolean;
}

function statusIcon(status: DocStatus) {
  switch (status) {
    case 'present': return <CheckCircle2 size={14} className="text-risk-safe" />;
    case 'missing': return <XCircle size={14} className="text-risk-critical" />;
    case 'inconsistent': return <AlertTriangle size={14} className="text-risk-medium" />;
    case 'low_confidence': return <HelpCircle size={14} className="text-risk-high" />;
    case 'not_applicable': return <MinusCircle size={14} className="text-muted-foreground" />;
    case 'optional_present': return <CheckCircle2 size={14} className="text-muted-foreground" />;
  }
}

function statusLabel(status: DocStatus) {
  switch (status) {
    case 'present': return 'Present';
    case 'missing': return 'Missing';
    case 'inconsistent': return 'Inconsistent';
    case 'low_confidence': return 'Low Confidence';
    case 'not_applicable': return 'N/A';
    case 'optional_present': return 'Optional ✓';
  }
}

function readinessBadge(readiness: PacketScoreResult['filingReadiness']) {
  switch (readiness) {
    case 'ready':
      return <Badge className="bg-risk-safe/20 text-risk-safe border-risk-safe/30 font-mono text-[10px]">BROKER READY</Badge>;
    case 'needs_review':
      return <Badge className="bg-risk-medium/20 text-risk-medium border-risk-medium/30 font-mono text-[10px]">NEEDS REVIEW</Badge>;
    case 'not_ready':
      return <Badge className="bg-risk-critical/20 text-risk-critical border-risk-critical/30 font-mono text-[10px]">NOT READY</Badge>;
  }
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-risk-safe';
  if (score >= 50) return 'text-risk-medium';
  return 'text-risk-critical';
}

function progressColor(score: number) {
  if (score >= 80) return '[&>div]:bg-risk-safe';
  if (score >= 50) return '[&>div]:bg-risk-medium';
  return '[&>div]:bg-risk-critical';
}

export function PacketScoreCard({ result, compact = false }: PacketScoreCardProps) {
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set());

  const toggleLayer = (idx: number) => {
    const next = new Set(expandedLayers);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setExpandedLayers(next);
  };

  if (compact) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider">PACKET SCORE</span>
          {readinessBadge(result.filingReadiness)}
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-3xl font-bold font-mono ${scoreColor(result.overallScore)}`}>
            {result.overallScore}
          </span>
          <div className="flex-1">
            <Progress value={result.overallScore} className={`h-2 ${progressColor(result.overallScore)}`} />
          </div>
        </div>
        {result.topMissing.length > 0 && (
          <div className="text-xs text-risk-critical">
            Missing: {result.topMissing.slice(0, 3).join(', ')}
            {result.topMissing.length > 3 && ` +${result.topMissing.length - 3} more`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs text-muted-foreground tracking-wider">DOCUMENT PACKET COMPLETENESS</h3>
        {readinessBadge(result.filingReadiness)}
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center space-y-1">
          <div className={`text-3xl font-bold font-mono ${scoreColor(result.overallScore)}`}>{result.overallScore}</div>
          <div className="text-[10px] font-mono text-muted-foreground">OVERALL</div>
        </div>
        <div className="text-center space-y-1">
          <div className={`text-3xl font-bold font-mono ${scoreColor(result.presenceScore)}`}>{result.presenceScore}</div>
          <div className="text-[10px] font-mono text-muted-foreground">PRESENCE</div>
        </div>
        <div className="text-center space-y-1">
          <div className={`text-3xl font-bold font-mono ${scoreColor(result.overallScore)}`}>
            {result.filingReadiness === 'ready' ? '✓' : result.filingReadiness === 'needs_review' ? '?' : '✗'}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">FILING</div>
        </div>
      </div>

      {/* Layer breakdown */}
      <div className="space-y-2">
        {result.layers.map((layer, idx) => (
          <Collapsible key={idx} open={expandedLayers.has(idx)} onOpenChange={() => toggleLayer(idx)}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono">{layer.label}</span>
                    <span className={`text-xs font-mono font-bold ${scoreColor(layer.score)}`}>{layer.score}%</span>
                  </div>
                  <Progress value={layer.score} className={`h-1 mt-1 ${progressColor(layer.score)}`} />
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{Math.round(layer.weight * 100)}%</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-2 pb-2 space-y-1">
                {layer.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                    {statusIcon(item.status)}
                    <span className={item.status === 'missing' && item.required ? 'text-risk-critical' : 'text-foreground'}>
                      {item.name}
                    </span>
                    <span className="text-muted-foreground text-[10px] ml-auto">
                      {statusLabel(item.status)}
                    </span>
                    {item.required && <Badge variant="outline" className="text-[9px] px-1 py-0">REQ</Badge>}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Issues */}
      {(result.topMissing.length > 0 || result.topInconsistencies.length > 0) && (
        <div className="border-t border-border pt-3 space-y-2">
          {result.topMissing.length > 0 && (
            <div>
              <span className="text-[10px] font-mono text-risk-critical">MISSING REQUIRED</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.topMissing.map(m => (
                  <Badge key={m} variant="outline" className="text-[10px] text-risk-critical border-risk-critical/30">{m}</Badge>
                ))}
              </div>
            </div>
          )}
          {result.topInconsistencies.length > 0 && (
            <div>
              <span className="text-[10px] font-mono text-risk-medium">INCONSISTENCIES</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.topInconsistencies.map(m => (
                  <Badge key={m} variant="outline" className="text-[10px] text-risk-medium border-risk-medium/30">{m}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
