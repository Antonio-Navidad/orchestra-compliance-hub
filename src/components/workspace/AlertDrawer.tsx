import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X, AlertTriangle, ShieldAlert, CheckCircle2, Info, Upload, Mail,
  MinusCircle, StickyNote, ExternalLink, ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AlertDrawerData } from "@/lib/alertDrawerContent";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AlertDrawerData | null;
  onUpload?: (docId: string) => void;
  onMarkNA?: (docId: string) => void;
}

const SEVERITY_CONFIG: Record<string, { badge: string; icon: typeof AlertTriangle; iconClass: string }> = {
  critical: { badge: 'bg-red-500/15 text-red-600 border-red-500/30', icon: ShieldAlert, iconClass: 'text-red-500' },
  high: { badge: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: AlertTriangle, iconClass: 'text-amber-500' },
  medium: { badge: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30', icon: AlertTriangle, iconClass: 'text-yellow-600' },
  low: { badge: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Info, iconClass: 'text-blue-500' },
  info: { badge: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Info, iconClass: 'text-blue-500' },
  success: { badge: 'bg-green-500/15 text-green-600 border-green-500/30', icon: CheckCircle2, iconClass: 'text-green-500' },
};

export function AlertDrawer({ open, onOpenChange, data, onUpload, onMarkNA }: Props) {
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!data) return null;

  const sev = SEVERITY_CONFIG[data.severity] || SEVERITY_CONFIG.medium;
  const SevIcon = sev.icon;

  const handleAction = (action: typeof data.quickActions[0]) => {
    switch (action.type) {
      case 'upload':
        if (action.docId && onUpload) {
          onUpload(action.docId);
        }
        break;
      case 'request':
        setShowEmailDraft(true);
        break;
      case 'mark_na':
        if (data.id && onMarkNA) {
          onMarkNA(data.id);
          onOpenChange(false);
        }
        break;
      case 'note':
        setShowNote(true);
        break;
      case 'navigate':
        if (action.href) {
          window.location.href = action.href;
        }
        break;
      case 'link':
        if (action.href) {
          window.open(action.href, '_blank', 'noopener');
        }
        break;
    }
  };

  const actionIcon = (type: string) => {
    switch (type) {
      case 'upload': return <Upload size={12} />;
      case 'request': return <Mail size={12} />;
      case 'mark_na': return <MinusCircle size={12} />;
      case 'note': return <StickyNote size={12} />;
      case 'navigate': return <ArrowRight size={12} />;
      case 'link': return <ExternalLink size={12} />;
      default: return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setShowEmailDraft(false); setShowNote(false); } }}>
      <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto p-0" side="right">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border bg-card/50">
          <div className="flex items-start gap-3">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", sev.badge.split(' ')[0])}>
              <SevIcon size={18} className={sev.iconClass} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-[15px] font-bold leading-tight pr-6">{data.title}</SheetTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-semibold uppercase tracking-wide", sev.badge)}>
                  {data.severity}
                </Badge>
                {data.regulation && (
                  <span className="text-[10px] text-muted-foreground/70">{data.regulation}</span>
                )}
                {data.financialImpact && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/5 text-red-600 border-red-500/20">
                    {data.financialImpact}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Content sections */}
        <div className="px-5 py-4 space-y-5">
          {/* What is this */}
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Info size={11} /> What is this
            </h4>
            <p className="text-[13px] leading-[1.7] text-foreground/90">{data.whatIsThis}</p>
          </section>

          <Separator />

          {/* Why it matters */}
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-1.5">
              <AlertTriangle size={11} /> Why it matters
            </h4>
            <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-3">
              <p className="text-[13px] leading-[1.7] text-foreground/90">{data.whyItMatters}</p>
            </div>
          </section>

          <Separator />

          {/* What to do */}
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={11} /> What to do
            </h4>
            <div className="space-y-2">
              {data.whatToDo.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary tabular-nums">{i + 1}</span>
                  </div>
                  <p className="text-[13px] leading-[1.6] text-foreground/85">{step}</p>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Quick Actions */}
          {data.quickActions.length > 0 && (
            <section>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Quick Actions
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.quickActions.map((action, i) => (
                  <Button
                    key={i}
                    variant={action.type === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "text-[11px] h-8 gap-1.5",
                      action.type === 'upload' && "bg-primary",
                      action.type === 'mark_na' && "text-muted-foreground",
                    )}
                    onClick={() => handleAction(action)}
                  >
                    {actionIcon(action.type)} {action.label}
                  </Button>
                ))}
              </div>
            </section>
          )}

          {/* Email draft panel */}
          {showEmailDraft && (
            <>
              <Separator />
              <section className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Mail size={11} /> Request Document
                </h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">To</Label>
                    <Input placeholder="supplier@company.com" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Subject</Label>
                    <Input
                      defaultValue={`Document Request: ${data.title}`}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Message</Label>
                    <Textarea
                      className="text-xs min-h-[100px]"
                      defaultValue={`Dear Partner,\n\nWe require the following document for our customs entry filing:\n\n${data.title}\n\nThis document is needed because:\n${data.whyItMatters.split('.')[0]}.\n\nPlease provide at your earliest convenience.\n\nRegards`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="text-[11px] h-7 gap-1">
                      <Mail size={10} /> Send Request
                    </Button>
                    <Button variant="ghost" size="sm" className="text-[11px] h-7" onClick={() => setShowEmailDraft(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Note panel */}
          {showNote && (
            <>
              <Separator />
              <section className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <StickyNote size={11} /> Add Note
                </h4>
                <Textarea
                  className="text-xs min-h-[80px]"
                  placeholder="Add a note about this requirement..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="text-[11px] h-7" disabled={!noteText.trim()}>
                    Save Note
                  </Button>
                  <Button variant="ghost" size="sm" className="text-[11px] h-7" onClick={() => setShowNote(false)}>
                    Cancel
                  </Button>
                </div>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
