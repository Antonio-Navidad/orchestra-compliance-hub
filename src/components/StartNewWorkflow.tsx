import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Route, Package, FileText, Radio, Zap, ShoppingCart, Eye, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowCTAItem {
  label: string;
  url: string;
  icon: any;
  description?: string;
}

interface StartNewWorkflowProps {
  /** Which CTAs to show — if omitted, shows all */
  filter?: string[];
  /** Compact strip vs full cards */
  variant?: "cards" | "strip";
  className?: string;
}

const ALL_CTAS: WorkflowCTAItem[] = [
  { label: "New Shipment", url: "/intake", icon: Plus, description: "Create a new shipment" },
  { label: "New Route", url: "/creator-mode", icon: Route, description: "Design a multimodal route" },
  { label: "New Compliance Review", url: "/validate-docs", icon: FileText, description: "Validate documents" },
  { label: "New Watchlist", url: "/watch-mode", icon: Radio, description: "Monitor live shipments" },
  { label: "Decision Twin", url: "/decision-twin", icon: Zap, description: "Run scenario analysis" },
  { label: "Classify Product", url: "/classify", icon: Eye, description: "HS code classification" },
  { label: "New Order", url: "/seller-mode", icon: ShoppingCart, description: "Marketplace order flow" },
  { label: "Audit Trail", url: "/audit-trail", icon: Scale, description: "Review audit records" },
];

export function StartNewWorkflow({ filter, variant = "strip", className }: StartNewWorkflowProps) {
  const items = filter
    ? ALL_CTAS.filter(c => filter.includes(c.label))
    : ALL_CTAS.slice(0, 5);

  if (variant === "cards") {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[10px] font-mono text-muted-foreground tracking-wider flex items-center gap-1">
          <Plus size={10} className="text-primary" /> START NEW WORKFLOW
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {items.map((cta) => (
            <Link key={cta.label} to={cta.url}>
              <Card className="bg-card border-border hover:border-primary/40 hover:bg-accent/30 transition-all cursor-pointer group h-full">
                <CardContent className="p-3 flex flex-col gap-1">
                  <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <cta.icon size={14} className="text-primary" />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-foreground group-hover:text-primary transition-colors">
                    {cta.label}
                  </span>
                  {cta.description && (
                    <span className="text-[9px] text-muted-foreground leading-tight">{cta.description}</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Strip variant
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <span className="text-[10px] font-mono text-muted-foreground tracking-wider mr-1">
        <Plus size={10} className="inline text-primary mr-0.5" />START:
      </span>
      {items.map((cta) => (
        <Link key={cta.label} to={cta.url}>
          <Button variant="outline" size="sm" className="h-7 text-[10px] font-mono gap-1 border-border hover:border-primary/40">
            <cta.icon size={11} /> {cta.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
