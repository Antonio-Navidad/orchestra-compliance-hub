import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, ExternalLink, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import type { DocItem } from "@/lib/packetScore";

interface PacketItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DocItem | null;
  jurisdictionCode: string;
}

function getDocExplanation(type: string, jurisdiction: string) {
  const explanations: Record<string, { what: string; why: string; fixLabel: string; fixRoute: string }> = {
    commercial_invoice: {
      what: "A commercial invoice is the primary document for customs valuation. It details the transaction between buyer and seller including product descriptions, quantities, prices, and terms of sale.",
      why: `Required by customs authorities in ${jurisdiction} to assess duty rates, verify declared values, and ensure proper classification. Missing or incomplete invoices cause 35% of all customs delays.`,
      fixLabel: "Upload Commercial Invoice",
      fixRoute: "/doc-intel?tab=library",
    },
    packing_list: {
      what: "A packing list itemizes the contents of each package in the shipment, including weights, dimensions, and package markings. It complements the commercial invoice.",
      why: "Customs uses packing lists to verify physical contents match declared goods. Discrepancies between invoice and packing list trigger examination.",
      fixLabel: "Upload Packing List",
      fixRoute: "/doc-intel?tab=library",
    },
    bill_of_lading: {
      what: "A Bill of Lading (B/L) is a legal document issued by the carrier confirming receipt of goods for shipment. It serves as a receipt, contract of carriage, and document of title.",
      why: "Required for customs clearance as proof of shipment. Without a B/L, goods cannot be released from port.",
      fixLabel: "Upload Bill of Lading",
      fixRoute: "/doc-intel?tab=library",
    },
    air_waybill: {
      what: "An Air Waybill (AWB) is the transport document for air cargo, issued by the airline or freight forwarder. It serves as receipt and contract of carriage.",
      why: "Required for air freight customs clearance. Without an AWB, goods cannot clear air cargo facilities.",
      fixLabel: "Upload Air Waybill",
      fixRoute: "/doc-intel?tab=library",
    },
    certificate_of_origin: {
      what: "A Certificate of Origin (COO) certifies the country where goods were manufactured or produced. It may be required to claim preferential trade agreement rates.",
      why: "Without a valid COO, preferential duty rates cannot be applied, potentially increasing costs by 5-25%.",
      fixLabel: "Upload COO",
      fixRoute: "/doc-intel?tab=library",
    },
    customs_declaration: {
      what: "The customs declaration (entry) is the formal filing with the destination country's customs authority declaring goods for import or export.",
      why: `${jurisdiction} customs requires this filing to process entry. Late or missing declarations incur penalties.`,
      fixLabel: "View Filing Requirements",
      fixRoute: "/compliance",
    },
    _field_commodity: {
      what: "The commodity description should include the product name, material composition, intended use, and any distinguishing characteristics.",
      why: "Customs requires sufficient description detail to verify HS code accuracy. Vague descriptions increase examination risk by 40%.",
      fixLabel: "Improve Description",
      fixRoute: "#description",
    },
    _field_quantity: {
      what: "Quantity and weight must be specified for customs valuation and statistical purposes.",
      why: "Missing quantity data prevents accurate duty calculation and delays customs processing.",
      fixLabel: "Enter Quantity",
      fixRoute: "#quantity",
    },
    _field_value: {
      what: "The declared value represents the transaction value of goods and forms the basis for duty calculation.",
      why: "Under-declaration or missing values trigger customs audits and potential penalties of 2-4x the underpaid duty.",
      fixLabel: "Enter Value",
      fixRoute: "#declared_value",
    },
    _q_hs: {
      what: "The HS/HTS code classifies your product for tariff and regulatory purposes. Accuracy is critical for proper duty assessment.",
      why: "Incorrect HS codes are the #1 cause of customs penalties. Misclassification can result in seizure of goods.",
      fixLabel: "Open HS Assist",
      fixRoute: "/doc-intel?tab=hs-assist",
    },
    _q_desc: {
      what: "Description quality measures whether your commodity description contains enough detail for customs classification verification.",
      why: "A vague description (e.g., 'clothing' instead of 'men's cotton t-shirts, 100% cotton, crew neck') increases customs examination risk by 40% and is the most common compliance mistake.",
      fixLabel: "Improve Description",
      fixRoute: "#description",
    },
  };

  return explanations[type] || {
    what: "This document or data field is part of the customs compliance requirements for your shipment.",
    why: `Required by ${jurisdiction} customs authority for complete entry processing.`,
    fixLabel: "View Requirements",
    fixRoute: "/compliance",
  };
}

export function PacketItemDrawer({ open, onOpenChange, item, jurisdictionCode }: PacketItemDrawerProps) {
  if (!item) return null;
  const info = getDocExplanation(item.type, jurisdictionCode);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            {item.status === "missing" ? (
              <AlertTriangle size={16} className="text-risk-critical" />
            ) : item.status === "low_confidence" ? (
              <AlertTriangle size={16} className="text-risk-high" />
            ) : (
              <FileText size={16} className="text-primary" />
            )}
            {item.name}
            {item.required && <Badge variant="outline" className="text-[9px]">REQ</Badge>}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* What this is */}
          <div className="space-y-2">
            <h4 className="font-mono text-[10px] text-muted-foreground tracking-wider">WHAT THIS IS</h4>
            <p className="text-sm text-foreground leading-relaxed">{info.what}</p>
          </div>

          {/* Why required */}
          <div className="space-y-2">
            <h4 className="font-mono text-[10px] text-muted-foreground tracking-wider">WHY IT'S REQUIRED</h4>
            <p className="text-sm text-foreground leading-relaxed">{info.why}</p>
          </div>

          {/* Fix action */}
          <div className="space-y-2">
            <h4 className="font-mono text-[10px] text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Lightbulb size={12} className="text-primary" />
              FIX IT NOW
            </h4>
            {info.fixRoute.startsWith("#") ? (
              <Button
                variant="default"
                size="sm"
                className="w-full font-mono text-xs gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  const el = document.querySelector(`[data-field="${info.fixRoute.slice(1)}"]`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  const input = el?.querySelector("input, textarea") as HTMLElement;
                  input?.focus();
                }}
              >
                {info.fixLabel}
              </Button>
            ) : (
              <Button variant="default" size="sm" className="w-full font-mono text-xs gap-1.5" asChild>
                <Link to={info.fixRoute}>
                  {info.fixLabel} <ExternalLink size={10} />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
