import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, FileText, Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocRequirementDrawer } from "./DocRequirementDrawer";
import type { DocRequirement, ModeDocProfile, FilingDeadline, KeyRisk } from "@/lib/shipmentModes";

interface Props {
  profile: ModeDocProfile;
  uploadedDocIds: string[];
  conditionalDocs: DocRequirement[];
}

export function DocChecklistPanel({ profile, uploadedDocIds, conditionalDocs }: Props) {
  const [selectedDoc, setSelectedDoc] = useState<DocRequirement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['required']));

  const toggle = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };

  const handleDocClick = (doc: DocRequirement) => {
    setSelectedDoc(doc);
    setDrawerOpen(true);
  };

  const allRequired = profile.required;
  const uploadedCount = allRequired.filter(d => uploadedDocIds.includes(d.id)).length;
  const totalRequired = allRequired.length;
  const readiness = totalRequired > 0 ? Math.round((uploadedCount / totalRequired) * 100) : 0;

  const sections = [
    { key: 'required', label: 'Required Documents', docs: profile.required, badgeColor: 'text-red-500' },
    { key: 'conditional', label: 'Conditional Documents', docs: conditionalDocs, badgeColor: 'text-amber-500' },
    { key: 'optional', label: 'Optional Documents', docs: profile.optional, badgeColor: 'text-blue-500' },
  ].filter(s => s.docs.length > 0);

  return (
    <div className="space-y-4">
      {/* Readiness Score */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Document Readiness
          </h3>
          <span className={cn(
            "text-lg font-bold tabular-nums",
            readiness >= 80 ? "text-green-600" : readiness >= 50 ? "text-amber-500" : "text-red-500"
          )}>
            {readiness}%
          </span>
        </div>
        <Progress
          value={readiness}
          className={cn(
            "h-2",
            readiness >= 80 ? "[&>div]:bg-green-500" : readiness >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
          )}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{uploadedCount} of {totalRequired} required documents present</span>
          {readiness < 100 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-[11px] text-primary"
              onClick={() => setExpandedSections(new Set(sections.map(s => s.key)))}
            >
              Show all gaps →
            </Button>
          )}
        </div>
      </div>

      {/* Document Sections */}
      {sections.map(section => {
        const uploaded = section.docs.filter(d => uploadedDocIds.includes(d.id)).length;
        const pct = section.docs.length > 0 ? Math.round((uploaded / section.docs.length) * 100) : 100;

        return (
          <Collapsible
            key={section.key}
            open={expandedSections.has(section.key)}
            onOpenChange={() => toggle(section.key)}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors cursor-pointer">
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{section.label}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5">
                      {uploaded}/{section.docs.length}
                    </Badge>
                  </div>
                  <Progress value={pct} className="h-1 mt-1.5" />
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-muted-foreground transition-transform",
                    expandedSections.has(section.key) && "rotate-180"
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-0.5 pl-1">
                {section.docs.map(doc => {
                  const isUploaded = uploadedDocIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleDocClick(doc)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-xs transition-colors",
                        "hover:bg-accent/40",
                        "active:scale-[0.99]",
                        !isUploaded && doc.status === 'required' && "bg-red-500/5"
                      )}
                    >
                      {isUploaded ? (
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                      ) : doc.status === 'required' ? (
                        <XCircle size={14} className="text-red-500 shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                      )}
                      <span className={cn(
                        "flex-1 font-medium",
                        !isUploaded && doc.status === 'required' ? "text-red-600 dark:text-red-400" : "text-foreground"
                      )}>
                        {doc.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {isUploaded ? 'Present' : 'Missing'}
                      </span>
                      {doc.status === 'required' && !isUploaded && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 border-red-500/30 text-red-500">
                          REQ
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Filing Deadlines */}
      {profile.filingDeadlines.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock size={12} /> Filing Deadlines
          </h3>
          <div className="space-y-2">
            {profile.filingDeadlines.map((deadline, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2 rounded-md bg-secondary/30">
                <div className="h-5 w-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={10} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{deadline.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{deadline.rule}</p>
                  <p className="text-[10px] text-red-500 mt-0.5">Penalty: {deadline.penalty}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Risks */}
      {profile.keyRisks.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert size={12} /> Key Risks
          </h3>
          <div className="space-y-2">
            {profile.keyRisks.slice(0, 3).map((risk, i) => (
              <div key={i} className="p-2.5 rounded-md border border-border space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5",
                      risk.severity === 'critical' ? "border-red-500/30 text-red-500" :
                      risk.severity === 'high' ? "border-amber-500/30 text-amber-500" :
                      "border-blue-500/30 text-blue-500"
                    )}
                  >
                    {risk.severity.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-semibold">{risk.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{risk.description}</p>
                <p className="text-[10px] text-green-600 dark:text-green-400">💡 {risk.preventionTip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <DocRequirementDrawer open={drawerOpen} onOpenChange={setDrawerOpen} doc={selectedDoc} />
    </div>
  );
}
