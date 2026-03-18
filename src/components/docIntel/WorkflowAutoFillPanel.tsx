import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, FileText, ArrowRight, Pencil, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AutoFilledField {
  fieldName: string;
  value: string;
  sourceDocument: string;
  sourceDocType: string;
  confidence: number;
  accepted: boolean;
}

interface WorkflowAutoFillPanelProps {
  autoFilledFields: AutoFilledField[];
  onAccept: (fieldName: string) => void;
  onReject: (fieldName: string) => void;
  onAcceptAll: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  origin_country: "Origin Country",
  destination_country: "Destination Country",
  hs_code: "HS Code",
  declared_value: "Declared Value",
  shipment_id: "Shipment ID",
  transport_mode: "Transport Mode",
  shipper_name: "Shipper",
  consignee_name: "Consignee",
  notify_party: "Notify Party",
  port_of_loading: "Port of Loading",
  port_of_discharge: "Port of Discharge",
  gross_weight_kg: "Gross Weight (kg)",
  net_weight_kg: "Net Weight (kg)",
  quantity: "Quantity",
  package_count: "Package Count",
  product_description: "Product Description",
  total_value: "Total Value",
  incoterms: "Incoterms",
  vessel_name: "Vessel Name",
  voyage_number: "Voyage Number",
  document_date: "Document Date",
};

export function WorkflowAutoFillPanel({ autoFilledFields, onAccept, onReject, onAcceptAll }: WorkflowAutoFillPanelProps) {
  const [showAll, setShowAll] = useState(false);

  const pending = autoFilledFields.filter(f => !f.accepted);
  const accepted = autoFilledFields.filter(f => f.accepted);
  const displayed = showAll ? autoFilledFields : pending.length > 0 ? pending : autoFilledFields.slice(0, 5);

  if (autoFilledFields.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <ArrowRight size={14} className="text-primary" />
            Workflow Auto-Fill
            <Badge variant="outline" className="text-[9px] font-mono bg-primary/10 text-primary border-primary/30">
              {autoFilledFields.length} fields
            </Badge>
          </CardTitle>
          {pending.length > 0 && (
            <Button variant="outline" size="sm" onClick={onAcceptAll} className="text-[10px] font-mono h-6 gap-1">
              <CheckCircle size={10} /> Accept All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        <p className="text-[10px] font-mono text-muted-foreground mb-2">
          Fields extracted from documents and mapped to workflow. Verify before proceeding.
        </p>

        {displayed.map(f => (
          <div
            key={f.fieldName}
            className={cn(
              "flex items-center gap-2 rounded p-2 text-xs font-mono border transition-colors",
              f.accepted
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-muted/20 border-border hover:border-primary/30"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[10px]">
                  {FIELD_LABELS[f.fieldName] || f.fieldName.replace(/_/g, " ")}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-[8px] px-1 py-0">
                        {Math.round(f.confidence * 100)}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-mono">
                      Source: {f.sourceDocument} ({f.sourceDocType.replace(/_/g, " ")})
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="font-medium truncate block">{f.value}</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[8px] text-muted-foreground/60 truncate max-w-[80px]" title={f.sourceDocument}>
                <FileText size={8} className="inline mr-0.5" />
                {f.sourceDocType.replace(/_/g, " ")}
              </span>
            </div>

            {!f.accepted ? (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onAccept(f.fieldName)}>
                  <CheckCircle size={10} className="text-emerald-400" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onReject(f.fieldName)}>
                  <Pencil size={10} className="text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <CheckCircle size={12} className="text-emerald-400 shrink-0" />
            )}
          </div>
        ))}

        {autoFilledFields.length > 5 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="text-[10px] font-mono w-full">
            {showAll ? "Show Less" : `Show All ${autoFilledFields.length} Fields`}
          </Button>
        )}

        {accepted.length > 0 && pending.length > 0 && (
          <p className="text-[9px] font-mono text-emerald-400/70 mt-1">
            ✓ {accepted.length} accepted · {pending.length} pending review
          </p>
        )}
      </CardContent>
    </Card>
  );
}
