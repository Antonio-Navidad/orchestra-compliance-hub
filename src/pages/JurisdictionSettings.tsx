import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Globe, Shield, Save, Info, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import { jurisdictionAdapters, euCoreDefaults, memberStateOverlays, type JurisdictionAdapter, type EUCoreFields, type MemberStateOverlay } from "@/lib/jurisdictions";

export default function JurisdictionSettings() {
  const { isAdmin } = useRole();
  const [selectedJurisdiction, setSelectedJurisdiction] = useState("EU");
  const [selectedMemberState, setSelectedMemberState] = useState("ES");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["base", "docs", "risk"]));

  const toggleSection = (s: string) => {
    const next = new Set(expandedSections);
    if (next.has(s)) next.delete(s); else next.add(s);
    setExpandedSections(next);
  };

  const adapter = jurisdictionAdapters[selectedJurisdiction];
  const overlay = memberStateOverlays[selectedMemberState];

  const handleSave = () => {
    toast.success("Jurisdiction settings saved (configurable persistence coming soon)");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <Globe size={18} className="text-primary" />
          <div>
            <h1 className="text-lg font-bold">Jurisdiction Settings</h1>
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest">EU CORE · MEMBER STATE OVERLAYS · PENALTY LOGIC</p>
          </div>
          {isAdmin && (
            <Button onClick={handleSave} className="ml-auto gap-1.5" size="sm">
              <Save size={14} /> Save Changes
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <Tabs defaultValue="eu-core">
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="eu-core" className="font-mono text-xs"><Globe size={12} className="mr-1" /> EU CORE</TabsTrigger>
            <TabsTrigger value="member-states" className="font-mono text-xs"><Shield size={12} className="mr-1" /> MEMBER STATES</TabsTrigger>
            <TabsTrigger value="global" className="font-mono text-xs">GLOBAL ADAPTERS</TabsTrigger>
          </TabsList>

          {/* EU Core Tab */}
          <TabsContent value="eu-core" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                  <Info size={14} className="text-primary" />
                  EU SHARED CUSTOMS/EXPORT-CONTROL BASE LAYER
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  These settings apply as the baseline for all EU Member States. Country-specific overlays modify these values.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Document Requirements */}
                <Collapsible open={expandedSections.has("docs")} onOpenChange={() => toggleSection("docs")}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-secondary/50">
                    {expandedSections.has("docs") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="font-mono text-xs font-bold">DOCUMENT REQUIREMENTS</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 pt-2 space-y-3">
                    {([
                      ["requires_invoice", "Commercial Invoice Required", euCoreDefaults.requires_invoice],
                      ["requires_packing_list", "Packing List Required", euCoreDefaults.requires_packing_list],
                      ["requires_transport_doc", "Transport Document Required", euCoreDefaults.requires_transport_doc],
                      ["requires_origin_supporting_doc_if_claimed", "Origin Support Doc (if preferential)", euCoreDefaults.requires_origin_supporting_doc_if_claimed],
                      ["requires_dual_use_check", "Dual-Use Check Required", euCoreDefaults.requires_dual_use_check],
                      ["requires_ens_security_data", "ENS Security Data Required", euCoreDefaults.requires_ens_security_data],
                    ] as [string, string, boolean][]).map(([key, label, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <Switch checked={value} disabled={!isAdmin} />
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Regulatory Flags */}
                <Collapsible open={expandedSections.has("reg")} onOpenChange={() => toggleSection("reg")}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-secondary/50">
                    {expandedSections.has("reg") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="font-mono text-xs font-bold">REGULATORY FLAGS</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 pt-2 space-y-3">
                    {([
                      ["ics2_applicable", "ICS2 Applicable", euCoreDefaults.ics2_applicable],
                      ["ioss_low_value_possible", "IOSS Low-Value Scheme Possible", euCoreDefaults.ioss_low_value_possible],
                      ["vat_special_scheme_possible", "VAT Special Scheme Possible", euCoreDefaults.vat_special_scheme_possible],
                    ] as [string, string, boolean][]).map(([key, label, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <Switch checked={value} disabled={!isAdmin} />
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Risk Scoring Baseline */}
                <Collapsible open={expandedSections.has("risk")} onOpenChange={() => toggleSection("risk")}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-secondary/50">
                    {expandedSections.has("risk") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="font-mono text-xs font-bold">RISK SCORING BASELINE</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 pt-2 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ["Commodity Code System", euCoreDefaults.commodity_code_system],
                        ["UCC Procedure Type", euCoreDefaults.ucc_procedure_type],
                        ["Declaration Type", euCoreDefaults.declaration_type],
                        ["Customs Value Method", euCoreDefaults.customs_value_method],
                        ["Origin Type", euCoreDefaults.origin_type],
                        ["Expected-Loss Model Version", euCoreDefaults.expected_loss_model_version],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label}>
                          <label className="text-[10px] text-muted-foreground font-mono">{label}</label>
                          <Input value={value} disabled={!isAdmin} className="h-8 text-xs font-mono bg-secondary/50 mt-1" />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Base Cost Parameters */}
                <Collapsible open={expandedSections.has("base")} onOpenChange={() => toggleSection("base")}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-secondary/50">
                    {expandedSections.has("base") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="font-mono text-xs font-bold">EXPECTED-LOSS PARAMETERS (EU)</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 pt-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground font-mono">Hold Daily Rate (€)</label>
                        <Input type="number" value={adapter?.holdDailyRate || 2200} disabled={!isAdmin} className="h-8 text-xs font-mono bg-secondary/50 mt-1" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-mono">Storage Daily Rate (€)</label>
                        <Input type="number" value={adapter?.storageDailyRate || 300} disabled={!isAdmin} className="h-8 text-xs font-mono bg-secondary/50 mt-1" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-mono">Avg Penalty %</label>
                        <Input type="number" value={adapter?.avgPenaltyPercent || 3.5} step="0.1" disabled={!isAdmin} className="h-8 text-xs font-mono bg-secondary/50 mt-1" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-mono">Legal Escalation Cost (€)</label>
                        <Input type="number" value={adapter?.legalEscalationCost || 20000} disabled={!isAdmin} className="h-8 text-xs font-mono bg-secondary/50 mt-1" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-mono">Rework Cost (€)</label>
                        <Input type="number" value={adapter?.reworkCost || 4500} disabled={!isAdmin} className="h-8 text-xs font-mono bg-secondary/50 mt-1" />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Member States Tab */}
          <TabsContent value="member-states" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <Select value={selectedMemberState} onValueChange={setSelectedMemberState}>
                <SelectTrigger className="w-[200px] bg-secondary/50 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(memberStateOverlays).map(ms => (
                    <SelectItem key={ms.code} value={ms.code} className="text-xs font-mono">
                      {ms.code} — {ms.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="font-mono text-[10px]">
                EU Base + {overlay?.name} Overlay
              </Badge>
            </div>

            {overlay && (
              <div className="space-y-4">
                {/* Penalty Model */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-mono text-xs text-muted-foreground">PENALTY & ENFORCEMENT MODEL — {overlay.name.toUpperCase()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Field label="Penalty Model" value={overlay.member_state_penalty_model} />
                      <Field label="Severity Multiplier" value={`×${overlay.penalty_severity_multiplier}`} />
                      <Field label="Settlement Likelihood" value={`${(overlay.settlement_likelihood_factor * 100).toFixed(0)}%`} />
                      <Field label="Enforcement Score" value={`${overlay.member_state_enforcement_intensity_score}/100`} />
                      <Field label="Hold Risk Multiplier" value={`×${overlay.member_state_hold_risk_multiplier}`} />
                      <Field label="Inspection Modifier" value={`×${overlay.inspection_probability_modifier}`} />
                      <Field label="Confiscation Flag" value={overlay.confiscation_or_additional_sanction_flag ? "Yes" : "No"} />
                      <Field label="Penalty Types" value={overlay.penalty_type_options.join(", ")} />
                    </div>
                  </CardContent>
                </Card>

                {/* Authority & Contacts */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-mono text-xs text-muted-foreground">AUTHORITIES & CONTACTS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Customs Authority" value={overlay.customs_authority_name} />
                      <Field label="Dual-Use Authority" value={overlay.dual_use_competent_authority} />
                      <Field label="Escalation Path" value={overlay.escalation_contact_path} />
                      <Field label="Broker Norms" value={overlay.local_broker_representation_norms} />
                    </div>
                  </CardContent>
                </Card>

                {/* Operational Profile */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-mono text-xs text-muted-foreground">OPERATIONAL PROFILE</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Field label="Clearance Baseline" value={`${overlay.local_clearance_time_baseline} days`} />
                      <Field label="SLA Baseline" value={`${overlay.local_sla_baseline}h`} />
                      <Field label="Delay Cost" value={`€${overlay.delay_cost_profile_by_member_state}`} />
                      <Field label="Broker Weight" value={`×${overlay.broker_performance_weight_by_member_state}`} />
                      <Field label="Confidence Adj" value={`${overlay.country_specific_confidence_adjustment >= 0 ? '+' : ''}${overlay.country_specific_confidence_adjustment}`} />
                      <Field label="Port/Border Profile" value={overlay.port_airport_border_risk_profile} />
                    </div>
                  </CardContent>
                </Card>

                {/* Local Nuances */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-mono text-xs text-muted-foreground">LOCAL NUANCES</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Document Nuances" value={overlay.local_document_nuance_flags.join(", ")} />
                      <Field label="Language Flags" value={overlay.language_or_formatting_nuance_flags.join(", ")} />
                      <Field label="VAT Profile" value={overlay.local_vat_import_handling_profile} />
                      <Field label="Amendment Tolerance" value={overlay.post_entry_amendment_tolerance_profile} />
                      <Field label="National Controls" value={overlay.national_control_measures_present ? "Present" : "None"} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Global Adapters Tab */}
          <TabsContent value="global" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(jurisdictionAdapters).map(a => (
                <Card key={a.code}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-mono text-xs flex items-center justify-between">
                      <span>{a.code} — {a.name}</span>
                      <Badge variant="outline" className="font-mono text-[9px]">{a.currency}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Hold/day:</span> <span className="font-mono">${a.holdDailyRate}</span></div>
                      <div><span className="text-muted-foreground">Storage/day:</span> <span className="font-mono">${a.storageDailyRate}</span></div>
                      <div><span className="text-muted-foreground">Penalty %:</span> <span className="font-mono">{a.avgPenaltyPercent}%</span></div>
                      <div><span className="text-muted-foreground">Legal:</span> <span className="font-mono">${a.legalEscalationCost.toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground">Rework:</span> <span className="font-mono">${a.reworkCost.toLocaleString()}</span></div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">{a.notes}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] text-muted-foreground font-mono block">{label}</span>
      <span className="text-xs font-mono">{value}</span>
    </div>
  );
}
