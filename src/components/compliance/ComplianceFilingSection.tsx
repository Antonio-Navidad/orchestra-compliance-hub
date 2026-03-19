import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, AlertTriangle, Calendar, ArrowRight } from "lucide-react";
import type { FilingRequirement } from "@/lib/complianceEngineData";
import { ComplianceFilingDrawer } from "./ComplianceFilingDrawer";

export function ComplianceFilingSection({ requirements, countryName }: { requirements: FilingRequirement[]; countryName: string }) {
  const [selectedFiling, setSelectedFiling] = useState<FilingRequirement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [departureDate, setDepartureDate] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);

  const openFiling = (f: FilingRequirement) => {
    setSelectedFiling(f);
    setDrawerOpen(true);
  };

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

  // Filing timeline visual
  const timelineItems = requirements.map((r, i) => {
    const before = r.detail.toLowerCase().includes("before");
    const hours = r.detail.match(/(\d+)\s*h/i);
    const days = r.detail.match(/(\d+)\s*day/i);
    const timeLabel = hours ? `${hours[1]}h before` : days ? `${days[1]}d before` : before ? "Pre-departure" : "At filing";
    return { ...r, timeLabel, order: hours ? -parseInt(hours[1]) : days ? -parseInt(days[1]) * 24 : 0 };
  }).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Filing Timeline Visual */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-mono text-muted-foreground">FILING TIMELINE</span>
          </div>
          <div className="relative">
            <div className="absolute top-3 left-0 right-0 h-0.5 bg-border" />
            <div className="flex justify-between relative">
              {timelineItems.map((item, i) => (
                <div key={i} className="flex flex-col items-center z-10 cursor-pointer" onClick={() => openFiling(item)}>
                  <div className="h-6 w-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mb-1">
                    <span className="text-[8px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <span className="text-[8px] font-mono text-muted-foreground text-center max-w-[80px]">{item.timeLabel}</span>
                  <span className="text-[8px] text-center max-w-[80px] mt-0.5 line-clamp-2">{item.rule}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deadline Calculator */}
      <Card className="border-primary/20">
        <CardContent className="py-3 flex items-center gap-3 flex-wrap">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs font-medium">Calculate My Deadlines</p>
            <p className="text-[10px] text-muted-foreground">Enter departure date to see all filing deadlines</p>
          </div>
          <Input
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="w-36 h-8 text-xs"
          />
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowTimeline(!showTimeline)} disabled={!departureDate}>
            Calculate
          </Button>
        </CardContent>
      </Card>

      {showTimeline && departureDate && (
        <Card>
          <CardContent className="py-3 space-y-2">
            <p className="text-[10px] font-mono text-muted-foreground">DEADLINES BASED ON DEPARTURE: {departureDate}</p>
            {requirements.map((r, i) => {
              const dep = new Date(departureDate);
              const hours = r.detail.match(/(\d+)\s*h/i);
              const days = r.detail.match(/(\d+)\s*day/i);
              let deadline = new Date(dep);
              if (hours) deadline.setHours(deadline.getHours() - parseInt(hours[1]));
              else if (days) deadline.setDate(deadline.getDate() - parseInt(days[1]));
              const deadlineStr = deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              const isPast = deadline < new Date();
              return (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-md ${isPast ? "bg-destructive/5 border border-destructive/20" : "bg-muted/30"}`}>
                  <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${isPast ? "text-destructive" : "text-amber-500"}`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium">{r.rule}</p>
                    <p className="text-[10px] text-muted-foreground">Due: {deadlineStr}</p>
                  </div>
                  {isPast && <Badge variant="destructive" className="text-[8px]">OVERDUE</Badge>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] font-mono text-muted-foreground">
        {requirements.length} FILING REQUIREMENT{requirements.length !== 1 ? "S" : ""}
      </p>

      {requirements.map((req, i) => (
        <Card key={i} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openFiling(req)}>
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
              <span className="text-[9px] text-primary font-mono shrink-0">Details →</span>
            </div>
          </CardContent>
        </Card>
      ))}

      <ComplianceFilingDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        filing={selectedFiling}
        countryName={countryName}
      />
    </div>
  );
}
