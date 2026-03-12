import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Send, Mail, Copy, Phone, FileText, AlertTriangle, CheckCircle2, Clock, Package } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shipmentId: string;
  brokerId?: string | null;
  brokerName?: string | null;
  direction?: string | null;
  destinationCountry?: string | null;
  packetScore?: number;
  filingReadiness?: string;
  trigger?: React.ReactNode;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  bill_of_lading: "Bill of Lading",
  air_waybill: "Air Waybill",
  certificate_of_origin: "Certificate of Origin",
  dangerous_goods_declaration: "Dangerous Goods Declaration",
  export_license: "Export License",
  import_permit: "Import Permit",
  customs_declaration: "Customs Declaration",
  inspection_certificate: "Inspection Certificate",
  insurance_certificate: "Insurance Certificate",
  phytosanitary_certificate: "Phytosanitary Certificate",
  fumigation_certificate: "Fumigation Certificate",
  multimodal_transport_doc: "Multimodal Transport Doc",
  other: "Other",
};

export function SendToBrokerPanel({ shipmentId, brokerId, brokerName, direction, destinationCountry, packetScore, filingReadiness, trigger }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState(`[ORCHESTRA] Document Packet — Shipment ${shipmentId}`);
  const [emailBody, setEmailBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: broker } = useQuery({
    queryKey: ["broker-send", brokerId],
    queryFn: async () => {
      if (!brokerId) return null;
      const { data, error } = await supabase.from("brokers").select("*").eq("id", brokerId).single();
      if (error) return null;
      return data;
    },
    enabled: !!brokerId,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["shipment-docs-send", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_documents" as any)
        .select("*")
        .eq("shipment_id", shipmentId)
        .eq("is_current", true);
      if (error) return [];
      return data as any[];
    },
  });

  const contactEmail = broker?.contact_email || "";
  const contactName = broker?.contact_name || "";
  const contactPhone = broker?.contact_phone || "";

  const generateDraft = () => {
    const selectedDocNames = docs
      .filter((d: any) => selectedDocs.includes(d.id))
      .map((d: any) => DOC_TYPE_LABELS[d.document_type] || d.document_type);

    return `Dear ${contactName || "[Broker Contact]"},

Please find the document packet for Shipment ${shipmentId}.

Direction: ${direction === "outbound" ? "Outbound / Export" : "Inbound / Import"}
Destination: ${destinationCountry || "—"}
${packetScore !== undefined ? `Packet Completeness: ${packetScore}%` : ""}
${filingReadiness ? `Filing Readiness: ${filingReadiness.replace(/_/g, " ").toUpperCase()}` : ""}

Documents included:
${selectedDocNames.length > 0 ? selectedDocNames.map((n: string) => `  • ${n}`).join("\n") : "  (No documents selected)"}

Please review and confirm receipt. Let us know if any additional documents are required.

Best regards,
${user?.user_metadata?.full_name || "ORCHESTRA Platform User"}`;
  };

  const logSend = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("shipment_events").insert({
        shipment_id: shipmentId,
        event_type: "documents_sent_to_broker",
        description: `Sent ${selectedDocs.length} document(s) to ${broker?.canonical_name || brokerName || "broker"}`,
        broker_id: brokerId || null,
        user_id: user?.id,
        user_name: user?.user_metadata?.full_name || user?.email,
        evidence_quality: "confirmed",
        attribution: "broker",
        confidence_level: 100,
        evidence_reference: `Email to ${contactEmail}`,
        metadata: {
          method: "email",
          recipient: contactEmail,
          recipient_name: contactName,
          docs_sent: selectedDocs,
          doc_count: selectedDocs.length,
          packet_score: packetScore,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broker-events"] });
      toast.success("Communication logged to shipment history");
    },
  });

  const handleSendEmail = () => {
    const body = emailBody || generateDraft();
    const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
    logSend.mutate();
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) => prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]);
  };

  const selectAllDocs = () => setSelectedDocs(docs.map((d: any) => d.id));

  const isReady = filingReadiness === "ready";
  const isNotReady = filingReadiness === "not_ready";

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1">
            <Send size={12} /> SEND TO BROKER
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-sm flex items-center gap-2">
            <Package size={16} className="text-primary" /> SEND TO BROKER — {shipmentId}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Readiness Banner */}
          {packetScore !== undefined && (
            <div className={`p-3 rounded-lg border ${
              isNotReady ? "border-destructive/30 bg-destructive/5" :
              isReady ? "border-risk-low/30 bg-risk-low/5" :
              "border-risk-medium/30 bg-risk-medium/5"
            }`}>
              <div className="flex items-center gap-2">
                {isNotReady ? <AlertTriangle size={14} className="text-destructive" /> :
                 isReady ? <CheckCircle2 size={14} className="text-risk-low" /> :
                 <Clock size={14} className="text-risk-medium" />}
                <div>
                  <p className="text-xs font-semibold">
                    {isReady ? "Packet Ready for Broker" : isNotReady ? "Packet Not Ready" : "Packet Needs Review"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Completeness: {packetScore}% · {filingReadiness?.replace(/_/g, " ").toUpperCase()}
                  </p>
                </div>
              </div>
              {isNotReady && (
                <p className="text-[10px] text-destructive mt-2">
                  ⚠ This packet has missing or inconsistent documents. Sending to broker may cause filing delays.
                </p>
              )}
            </div>
          )}

          {/* Broker Contact */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <p className="font-mono text-[10px] text-muted-foreground tracking-wider">BROKER RECIPIENT</p>
            {broker ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold">{broker.canonical_name}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>{contactName || "—"}</span>
                  <span>{broker.office || broker.region || "—"}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {contactEmail && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => handleCopy(contactEmail, "Email")}>
                      <Mail size={10} /> {contactEmail}
                    </Button>
                  )}
                  {contactPhone && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => handleCopy(contactPhone, "Phone")}>
                      <Phone size={10} /> {contactPhone}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No broker assigned. Assign a broker first.</p>
            )}
          </div>

          {/* Document Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-muted-foreground tracking-wider">SELECT DOCUMENTS TO INCLUDE</p>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] font-mono" onClick={selectAllDocs}>
                SELECT ALL
              </Button>
            </div>
            {docs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No documents uploaded for this shipment.</p>
            ) : (
              <div className="space-y-1">
                {docs.map((doc: any) => (
                  <label key={doc.id} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/30 cursor-pointer transition-colors">
                    <Checkbox checked={selectedDocs.includes(doc.id)} onCheckedChange={() => toggleDoc(doc.id)} />
                    <FileText size={12} className="text-muted-foreground" />
                    <span className="text-xs flex-1">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{doc.file_name}</span>
                  </label>
                ))}
              </div>
            )}
            {selectedDocs.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {selectedDocs.length} document(s) selected
              </Badge>
            )}
          </div>

          {/* Email Draft */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-muted-foreground tracking-wider">EMAIL DRAFT</p>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                setIsEditing(!isEditing);
                if (!emailBody) setEmailBody(generateDraft());
              }}>
                {isEditing ? "PREVIEW" : "EDIT"}
              </Button>
            </div>
            <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="h-8 text-xs font-mono" placeholder="Subject" />
            {isEditing ? (
              <Textarea
                value={emailBody || generateDraft()}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={10}
                className="text-xs font-mono"
              />
            ) : (
              <pre className="text-xs font-mono whitespace-pre-wrap bg-secondary/30 rounded-lg p-3 border border-border max-h-60 overflow-y-auto">
                {emailBody || generateDraft()}
              </pre>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-border pt-3">
            <Button
              className="flex-1 font-mono text-[10px] gap-1"
              onClick={handleSendEmail}
              disabled={!contactEmail || selectedDocs.length === 0}
            >
              <Mail size={12} /> SEND TO BROKER
            </Button>
            <Button variant="outline" className="font-mono text-[10px] gap-1" onClick={() => handleCopy(emailBody || generateDraft(), "Email draft")}>
              <Copy size={12} />
            </Button>
          </div>

          {/* Log-only actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="font-mono text-[10px] gap-1" onClick={() => logSend.mutate()}>
              <Send size={10} /> LOG AS SENT
            </Button>
            <Button variant="secondary" size="sm" className="font-mono text-[10px] gap-1" onClick={() => {
              const callScript = `Call Script — Shipment ${shipmentId}\n\nContact: ${contactName}\nPhone: ${contactPhone}\n\n1. Confirm receipt of document packet\n2. Review ${selectedDocs.length} attached documents\n3. Confirm filing timeline\n4. Flag any missing items`;
              handleCopy(callScript, "Call script");
            }}>
              <Phone size={10} /> CALL SCRIPT
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
