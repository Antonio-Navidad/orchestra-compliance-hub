import { useViewMode, PERSONA_LABELS, DIRECTION_LABELS, type ViewPersona } from "@/hooks/useViewMode";
import type { DirectionContext } from "@/lib/issueFraming";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Layers, ShoppingCart, ArrowDownToLine, ArrowUpFromLine,
  Building2, Truck, ShieldCheck, Eye, Crown,
  ArrowLeftRight, ChevronDown, Gauge
} from "lucide-react";
import { useState } from "react";

const PERSONA_ICONS: Record<ViewPersona, React.ElementType> = {
  seller: ShoppingCart,
  importer: ArrowDownToLine,
  exporter: ArrowUpFromLine,
  government: Building2,
  logistics: Truck,
  compliance: ShieldCheck,
  creator: Eye,
  enterprise: Crown,
};

const DIRECTION_ICONS: Record<DirectionContext, React.ElementType> = {
  inbound: ArrowDownToLine,
  outbound: ArrowUpFromLine,
  combined: ArrowLeftRight,
};

export function ViewModeSwitcher() {
  const { persona, direction, detailLevel, setPersona, setDirection, setDetailLevel } = useViewMode();
  const [open, setOpen] = useState(false);
  const PersonaIcon = PERSONA_ICONS[persona];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-xs font-mono">
          <PersonaIcon size={12} className="text-primary" />
          <span className="hidden sm:inline">{PERSONA_LABELS[persona]}</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono border-primary/30 text-primary">
            {DIRECTION_LABELS[direction]}
          </Badge>
          <ChevronDown size={10} className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {/* Persona Selection */}
        <div className="p-2">
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider px-1 mb-1.5">VIEW MODE</p>
          <div className="grid grid-cols-2 gap-0.5">
            {(Object.keys(PERSONA_LABELS) as ViewPersona[]).map((p) => {
              const Icon = PERSONA_ICONS[p];
              const active = persona === p;
              return (
                <button
                  key={p}
                  onClick={() => { setPersona(p); }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-mono transition-colors ${
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Icon size={12} />
                  {PERSONA_LABELS[p]}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Direction */}
        <div className="p-2">
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider px-1 mb-1.5">DIRECTION</p>
          <div className="flex gap-0.5">
            {(["inbound", "outbound", "combined"] as DirectionContext[]).map((d) => {
              const Icon = DIRECTION_ICONS[d];
              const active = direction === d;
              return (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-mono transition-colors ${
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Icon size={10} />
                  {DIRECTION_LABELS[d]}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Detail Level */}
        <div className="p-2">
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider px-1 mb-1.5">DETAIL LEVEL</p>
          <div className="flex gap-0.5">
            {(["simple", "advanced"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setDetailLevel(l)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-mono transition-colors ${
                  detailLevel === l ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Gauge size={10} />
                {l === "simple" ? "Simple" : "Advanced"}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
