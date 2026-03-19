import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { COMPLIANCE_COUNTRIES, getCountryProfile, getFilteredDocuments, getFilteredFilingRequirements } from "@/lib/complianceEngineData";
import type { TransportMode, Direction } from "@/lib/complianceEngineData";
import { ComplianceAuthoritySection } from "@/components/compliance/ComplianceAuthoritySection";
import { ComplianceDocumentsSection } from "@/components/compliance/ComplianceDocumentsSection";
import { ComplianceFilingSection } from "@/components/compliance/ComplianceFilingSection";
import { ComplianceDutiesSection } from "@/components/compliance/ComplianceDutiesSection";
import { ComplianceRestrictedSection } from "@/components/compliance/ComplianceRestrictedSection";
import { ComplianceViolationsSection } from "@/components/compliance/ComplianceViolationsSection";
import { ComplianceChangesSection } from "@/components/compliance/ComplianceChangesSection";
import { ComplianceReadinessIndicator } from "@/components/compliance/ComplianceReadinessIndicator";
import { ComplianceReadinessPanel } from "@/components/compliance/ComplianceReadinessPanel";
import { QuickComplianceCheck } from "@/components/compliance/QuickComplianceCheck";

export default function ComplianceEngine() {
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [mode, setMode] = useState<TransportMode | "all">("all");
  const [direction, setDirection] = useState<Direction | "all">("all");
  const [readinessPanelOpen, setReadinessPanelOpen] = useState(false);

  const profile = useMemo(() => getCountryProfile(selectedCountry), [selectedCountry]);
  const filteredDocs = useMemo(() => profile ? getFilteredDocuments(profile, mode, direction) : [], [profile, mode, direction]);
  const filteredFiling = useMemo(() => profile ? getFilteredFilingRequirements(profile, mode, direction) : [], [profile, mode, direction]);

  if (!profile) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Compliance Engine</h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
              MULTI-COUNTRY CUSTOMS COMPLIANCE INTELLIGENCE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-52 text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPLIANCE_COUNTRIES.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="mr-1.5">{c.flag}</span> {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={mode} onValueChange={(v) => setMode(v as TransportMode | "all")}>
            <SelectTrigger className="w-28 text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="air">✈️ Air</SelectItem>
              <SelectItem value="sea">🚢 Sea</SelectItem>
              <SelectItem value="land">🚛 Land</SelectItem>
            </SelectContent>
          </Select>

          <Select value={direction} onValueChange={(v) => setDirection(v as Direction | "all")}>
            <SelectTrigger className="w-32 text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Directions</SelectItem>
              <SelectItem value="inbound">📥 Inbound</SelectItem>
              <SelectItem value="outbound">📤 Outbound</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Country header card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-center gap-4">
          <span className="text-4xl">{profile.flag}</span>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{profile.name}</h2>
            <p className="text-xs text-muted-foreground">{profile.authority.name}</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
              FILING: {profile.authority.filingSystem} · PROCESSING: {profile.authority.processingTime}
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {mode !== "all" && <Badge variant="secondary" className="text-[9px] font-mono">{mode.toUpperCase()}</Badge>}
            {direction !== "all" && <Badge variant="secondary" className="text-[9px] font-mono">{direction.toUpperCase()}</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Quick Compliance Check */}
      <QuickComplianceCheck profile={profile} />

      {/* Compliance Readiness - clickable */}
      <div className="cursor-pointer" onClick={() => setReadinessPanelOpen(true)}>
        <ComplianceReadinessIndicator countryCode={profile.code} />
      </div>

      <ComplianceReadinessPanel
        open={readinessPanelOpen}
        onOpenChange={setReadinessPanelOpen}
        countryCode={profile.code}
        countryName={profile.name}
      />

      {/* Main content tabs */}
      <Tabs defaultValue="authority" className="space-y-4">
        <TabsList className="font-mono text-[10px] flex-wrap h-auto gap-1 bg-transparent p-0">
          {[
            { value: "authority", label: "Customs Authority" },
            { value: "documents", label: `Documents (${filteredDocs.length})` },
            { value: "filing", label: `Filing (${filteredFiling.length})` },
            { value: "duties", label: "Duties & Tariffs" },
            { value: "restricted", label: "Restricted Goods" },
            { value: "violations", label: "Common Violations" },
            { value: "changes", label: `Updates (${profile.regulatoryChanges.length})` },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-[10px] font-mono px-3 py-1.5 border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="authority">
          <ComplianceAuthoritySection profile={profile} />
        </TabsContent>
        <TabsContent value="documents">
          <ComplianceDocumentsSection documents={filteredDocs} mode={mode} direction={direction} countryName={profile.name} />
        </TabsContent>
        <TabsContent value="filing">
          <ComplianceFilingSection requirements={filteredFiling} countryName={profile.name} />
        </TabsContent>
        <TabsContent value="duties">
          <ComplianceDutiesSection profile={profile} />
        </TabsContent>
        <TabsContent value="restricted">
          <ComplianceRestrictedSection profile={profile} />
        </TabsContent>
        <TabsContent value="violations">
          <ComplianceViolationsSection profile={profile} />
        </TabsContent>
        <TabsContent value="changes">
          <ComplianceChangesSection profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
