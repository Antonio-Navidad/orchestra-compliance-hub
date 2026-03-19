import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { RequiredDocument, TransportMode, Direction } from "@/lib/complianceEngineData";

const modeIcons: Record<string, string> = { air: "✈️", sea: "🚢", land: "🚛" };
const dirIcons: Record<string, string> = { inbound: "📥", outbound: "📤" };

export function ComplianceDocumentsSection({
  documents,
  mode,
  direction,
}: {
  documents: RequiredDocument[];
  mode: TransportMode | "all";
  direction: Direction | "all";
}) {
  if (documents.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-mono">
            No documents match the selected mode and direction filters
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-muted-foreground">
        {documents.length} REQUIRED DOCUMENT{documents.length !== 1 ? "S" : ""}
        {mode !== "all" ? ` · ${mode.toUpperCase()}` : ""}
        {direction !== "all" ? ` · ${direction.toUpperCase()}` : ""}
      </p>
      {documents.map((doc, i) => (
        <Card key={i}>
          <CardContent className="py-3 flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{doc.name}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {doc.modes.map(m => (
                  <Badge key={m} variant="outline" className="text-[9px] px-1.5 py-0">
                    {modeIcons[m]} {m}
                  </Badge>
                ))}
                {doc.directions.map(d => (
                  <Badge key={d} variant="secondary" className="text-[9px] px-1.5 py-0">
                    {dirIcons[d]} {d}
                  </Badge>
                ))}
              </div>
            </div>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground/40 hover:text-primary cursor-help">
                    <Info size={14} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-[10px] max-w-[220px]">
                  View this document type in Document Intelligence for extraction and validation
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
