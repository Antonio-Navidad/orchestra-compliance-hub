import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import type { FilingRequirement } from "@/lib/complianceEngineData";

export function ComplianceFilingSection({ requirements }: { requirements: FilingRequirement[] }) {
  if (requirements.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-mono">
            No filing requirements match the selected filters
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-muted-foreground">
        {requirements.length} FILING REQUIREMENT{requirements.length !== 1 ? "S" : ""}
      </p>
      {requirements.map((req, i) => (
        <Card key={i}>
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold">{req.rule}</p>
                <p className="text-xs text-muted-foreground">{req.detail}</p>
                <div className="flex gap-1 flex-wrap">
                  {req.modes.map(m => (
                    <Badge key={m} variant="outline" className="text-[9px] px-1.5 py-0">{m}</Badge>
                  ))}
                  {req.directions.map(d => (
                    <Badge key={d} variant="secondary" className="text-[9px] px-1.5 py-0">{d}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
