import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Mail, Phone, Copy, Clock, Send, Info, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface EscalationRole {
  id: string;
  label: string;
  purpose: string;
  neededWhen: string[];
  severity: "recommended" | "consider" | "serious-only";
}

const ESCALATION_ROLES: EscalationRole[] = [
  { id: "customs_broker", label: "Customs Broker", purpose: "Handles customs filing, entry correction, tariff classification issues, customs status issues, and broker-side document review problems.", neededWhen: ["filing issue", "entry correction", "HS concern", "customs status issue"], severity: "recommended" },
  { id: "freight_forwarder", label: "Freight Forwarder / Carrier Ops", purpose: "Handles transportation execution, routing, movement coordination, and timing issues.", neededWhen: ["transport doc mismatch", "routing problem", "container movement issue", "terminal timing risk"], severity: "recommended" },
  { id: "supplier", label: "Supplier / Shipper / Exporter", purpose: "Handles source document accuracy and shipment-origin data issues.", neededWhen: ["invoice wrong", "COO missing", "packing list mismatch", "product description unclear"], severity: "recommended" },
  { id: "internal_compliance", label: "Internal Compliance Team", purpose: "Handles sanctions, export control, legal-sensitive compliance issues.", neededWhen: ["sanctions risk", "dual-use issue", "high-value exposure", "repeated broker issue"], severity: "consider" },
  { id: "internal_logistics", label: "Internal Logistics / Import Ops", purpose: "Handles shipment monitoring, delivery timing, rerouting.", neededWhen: ["broker unresponsive", "customer delivery impacted", "alternate routing needed"], severity: "consider" },
  { id: "legal_counsel", label: "Legal / Outside Counsel", purpose: "Reserved for serious legal-risk cases involving penalties, fraud, seizure.", neededWhen: ["fraud suspicion", "seizure risk", "major under-declaration", "penalty notice"], severity: "serious-only" },
  { id: "consignee", label: "Consignee / Receiving Warehouse", purpose: "Handles downstream operational impact at destination.", neededWhen: ["delay affects unloading", "hold may create stockout", "ETA changing significantly"], severity: "consider" },
];

const SEVERITY_LABELS: Record<string, { text: string; className: string }> = {
  recommended: { text: "RECOMMENDED NOW", className: "bg-primary/20 text-primary border-primary/30" },
  consider: { text: "CONSIDER NOTIFYING", className: "bg-risk-medium/20 text-risk-medium border-risk-medium/30" },
  "serious-only": { text: "SERIOUS ESCALATION ONLY", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

interface Props {
  shipmentId: string;
  brokerId?: string | null;
  issueType?: string;
  issueDescription?: string;
  estimatedExposure?: number;
  trigger?: React.ReactNode;
}

export function EscalationPanel({ shipmentId, brokerId, issueType, issueDescription, estimatedExposure, trigger }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPosition, setContactPosition] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [emailSubject, setEmailSubject] = useState(`[ORCHESTRA] Action Required — Shipment ${shipmentId}`);
  const [emailBody, setEmailBody] = useState("");
  const [noteText, setNoteText] = useState("");

  const { data: broker } = useQuery({
    queryKey: ["broker-contact", brokerId],
    queryFn: async () => {
      if (!brokerId) return null;
      const { data, error } = await supabase.from("brokers").select("*").eq("id", brokerId).single();
      if (error) return null;
      return data;
    },
    enabled: !!brokerId,
  });

  // Auto-populate contact fields from broker when available
  const populateFromBroker = () => {
    if (broker) {
      setContactName(broker.contact_name || "");
      setContactEmail(broker.contact_email || "");
      setContactPhone(broker.contact_phone || "");
      setContactPosition("Customs Broker Contact");
      setEmailBody(generateEmailDraft());
    }
  };

  const generateEmailDraft = () => {
    return `Dear ${contactName || broker?.contact_name || "[Contact Name]"},

This is regarding shipment ${shipmentId}.

Issue detected: ${issueDescription || issueType || "Compliance issue requiring attention"}
${estimatedExposure ? `Estimated avoidable exposure: $${estimatedExposure.toLocaleString()}` : ""}

Immediate action is required to prevent further delays or penalties.

Please review and respond at your earliest convenience.

Best regards,
${user?.user_metadata?.full_name || "ORCHESTRA Platform User"}`;
  };

  const logEscalation = useMutation({
    mutationFn: async (method: string) => {
      const { error } = await supabase.from("shipment_events").insert({
        shipment_id: shipmentId,
        event_type: "escalation_sent",
        description: `Escalation via ${method} to ${contactName || "broker"} (${selectedRoles.join(", ")})`,
        broker_id: brokerId || null,
        user_id: user?.id,
        user_name: user?.user_metadata?.full_name || user?.email,
        evidence_quality: "confirmed",
        attribution: "broker",
        confidence_level: 100,
        evidence_reference: `Contact: ${contactEmail || contactPhone}`,
        metadata: { method, roles: selectedRoles, contact: { name: contactName, email: contactEmail, phone: contactPhone, position: contactPosition } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broker-events"] });
      toast.success("Escalation logged to audit trail");
    },
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleEmailClick = () => {
    const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody || generateEmailDraft())}`;
    window.open(mailto, "_blank");
    logEscalation.mutate("email");
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) => prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm" className="font-mono text-[10px] gap-1">
            <AlertTriangle size={12} /> ESCALATE
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-destructive" /> ESCALATION PANEL — {shipmentId}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Issue Summary */}
          {(issueType || issueDescription) && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-1">
              <p className="font-mono text-[10px] text-destructive tracking-wider">ISSUE DETECTED</p>
              <p className="text-sm font-medium">{issueDescription || issueType}</p>
              {estimatedExposure && (
                <p className="text-xs text-muted-foreground">Estimated avoidable exposure: <span className="text-destructive font-semibold">${estimatedExposure.toLocaleString()}</span></p>
              )}
            </div>
          )}

          <Tabs defaultValue="contact">
            <TabsList className="w-full bg-secondary/50 border border-border">
              <TabsTrigger value="contact" className="flex-1 font-mono text-[10px]">CONTACT</TabsTrigger>
              <TabsTrigger value="roles" className="flex-1 font-mono text-[10px]">ROLES GUIDE</TabsTrigger>
              <TabsTrigger value="log" className="flex-1 font-mono text-[10px]">LOG ACTION</TabsTrigger>
            </TabsList>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              {broker && (
                <Button variant="outline" size="sm" className="w-full font-mono text-[10px]" onClick={populateFromBroker}>
                  AUTO-FILL FROM BROKER: {broker.canonical_name}
                </Button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-muted-foreground">CONTACT NAME</label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-muted-foreground">POSITION</label>
                  <Input value={contactPosition} onChange={(e) => setContactPosition(e.target.value)} placeholder="Import Manager" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-muted-foreground">EMAIL</label>
                  <div className="flex gap-1">
                    <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="jane@broker.com" className="h-8 text-xs" />
                    {contactEmail && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleCopy(contactEmail, "Email")}><Copy size={12} /></Button>}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-muted-foreground">PHONE</label>
                  <div className="flex gap-1">
                    <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 555-0100" className="h-8 text-xs" />
                    {contactPhone && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleCopy(contactPhone, "Phone")}><Phone size={12} /></Button>}
                  </div>
                </div>
              </div>

              {/* Email Draft */}
              <div className="space-y-2 border-t border-border pt-3">
                <p className="font-mono text-[10px] text-muted-foreground tracking-wider">EMAIL DRAFT</p>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="h-8 text-xs font-mono" placeholder="Subject" />
                <Textarea value={emailBody || generateEmailDraft()} onChange={(e) => setEmailBody(e.target.value)} rows={8} className="text-xs font-mono" />
                <div className="flex gap-2">
                  <Button className="flex-1 font-mono text-[10px] gap-1" onClick={handleEmailClick} disabled={!contactEmail}>
                    <Mail size={12} /> SEND EMAIL
                  </Button>
                  <Button variant="outline" className="font-mono text-[10px] gap-1" onClick={() => handleCopy(emailBody || generateEmailDraft(), "Email draft")}>
                    <Copy size={12} /> COPY
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button variant="secondary" size="sm" className="font-mono text-[10px] gap-1" onClick={() => logEscalation.mutate("marked_notified")}>
                  <Send size={10} /> MARK NOTIFIED
                </Button>
                <Button variant="secondary" size="sm" className="font-mono text-[10px] gap-1" onClick={() => logEscalation.mutate("call_attempt")}>
                  <Phone size={10} /> LOG CALL
                </Button>
                <Button variant="secondary" size="sm" className="font-mono text-[10px] gap-1" onClick={() => logEscalation.mutate("follow_up_set")}>
                  <Clock size={10} /> SET FOLLOW-UP
                </Button>
              </div>
            </TabsContent>

            {/* Roles Guide Tab */}
            <TabsContent value="roles" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <p className="font-mono text-[10px] text-muted-foreground tracking-wider">SELECT ESCALATION RECIPIENTS</p>
                <Button variant="ghost" size="sm" className="font-mono text-[10px]" onClick={() => setSelectedRoles(ESCALATION_ROLES.map((r) => r.id))}>
                  SELECT ALL
                </Button>
              </div>

              <div className="text-[10px] text-muted-foreground p-2 rounded bg-secondary/30 border border-border">
                <Info size={10} className="inline mr-1" /> Sometimes the fine is not the biggest loss — operational disruption can be more costly than the penalty itself.
              </div>

              {ESCALATION_ROLES.map((role) => (
                <div key={role.id} className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={selectedRoles.includes(role.id)} onCheckedChange={() => toggleRole(role.id)} className="mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{role.label}</span>
                        <Badge variant="outline" className={`text-[9px] font-mono ${SEVERITY_LABELS[role.severity].className}`}>
                          {SEVERITY_LABELS[role.severity].text}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{role.purpose}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {role.neededWhen.map((w) => (
                          <span key={w} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{w}</span>
                        ))}
                      </div>
                      {role.severity === "serious-only" && (
                        <p className="text-[10px] text-destructive mt-1">⚠ Reserve for serious cases — penalties, fraud, seizure, repeated noncompliance.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Log Action Tab */}
            <TabsContent value="log" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="font-mono text-[10px] text-muted-foreground tracking-wider">INTERNAL NOTE</label>
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} placeholder="Log call outcome, next steps, or internal notes..." className="text-xs" />
                <Button className="w-full font-mono text-[10px]" disabled={!noteText.trim()} onClick={() => {
                  logEscalation.mutate("internal_note");
                  setNoteText("");
                }}>
                  ADD TO AUDIT TRAIL
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
