import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, FileText, ExternalLink, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import type { DocRequirement } from "@/lib/shipmentModes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: DocRequirement | null;
}

export function DocRequirementDrawer({ open, onOpenChange, doc }: Props) {
  if (!doc) return null;

  const statusColors: Record<string, string> = {
    required: 'bg-red-500/10 text-red-600 border-red-500/20',
    conditional: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    optional: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <FileText size={18} className="text-primary" />
            </div>
            <div className="space-y-1">
              <SheetTitle className="text-base font-bold leading-tight">{doc.name}</SheetTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColors[doc.status]}>
                  {doc.status.toUpperCase()}
                </Badge>
                <span className="text-[11px] text-muted-foreground">Source: {doc.source}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* What It Is */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              What This Document Is
            </h4>
            <p className="text-sm leading-relaxed text-foreground">{doc.whatItIs}</p>
          </section>

          <Separator />

          {/* Why Required */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Why It's Required
            </h4>
            <p className="text-sm leading-relaxed text-foreground">{doc.whyRequired}</p>
            {doc.condition && (
              <div className="mt-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span><strong>Condition:</strong> {doc.condition}</span>
                </p>
              </div>
            )}
          </section>

          <Separator />

          {/* Must Contain */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Must Contain
            </h4>
            <ul className="space-y-1.5">
              {doc.mustContain.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <Separator />

          {/* Common Mistakes */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-1.5">
              <ShieldAlert size={13} />
              Top Mistakes
            </h4>
            <ul className="space-y-2">
              {doc.commonMistakes.map((mistake, i) => (
                <li key={i} className="rounded-md bg-red-500/5 border border-red-500/10 p-2.5">
                  <p className="text-xs leading-relaxed text-foreground">{mistake}</p>
                </li>
              ))}
            </ul>
          </section>

          <Separator />

          {/* Penalty */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Penalty If Missing or Incorrect
            </h4>
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{doc.penalty}</p>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Link to="/doc-intel" className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                <FileText size={12} /> View Template
              </Button>
            </Link>
            <Link to="/doc-intel?tab=mismatches" className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                <ExternalLink size={12} /> Check Documents
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
