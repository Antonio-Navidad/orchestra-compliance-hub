import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface IntakeExportProps {
  form: Record<string, any>;
  docs: { file: File; docType: string; id: string }[];
  packetScore: any;
  className?: string;
}

export function IntakeExportButton({ form, docs, packetScore, className }: IntakeExportProps) {
  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const shipmentId = form.shipment_id || "DRAFT";
    const date = new Date().toISOString().slice(0, 10);

    // Sheet 1 — Shipment Summary
    const summary = [{
      "Shipment ID": form.shipment_id,
      "Direction": form.direction,
      "Mode": form.mode,
      "Origin Country": form.origin_country,
      "Destination Country": form.destination_country,
      "Export Country": form.export_country,
      "Import Country": form.import_country,
      "Shipper": form.shipper,
      "Consignee": form.consignee,
      "HS Code": Array.isArray(form.hs_codes) ? form.hs_codes.join(", ") : form.hs_code,
      "Declared Value": form.declared_value,
      "Currency": form.currency,
      "Incoterm": form.incoterm,
      "Planned Departure": form.planned_departure,
      "Estimated Arrival": form.estimated_arrival,
      "B/L Number": form.bl_number || "",
      "Container Number": form.container_number || "",
      "Seal Number": form.seal_number || "",
      "Vessel": form.vessel_name || "",
      "Port of Loading": form.port_of_loading || "",
      "Port of Discharge": form.port_of_discharge || "",
      "Gross Weight": form.gross_weight || "",
      "Net Weight": form.net_weight || "",
      "Volume (CBM)": form.volume || "",
      "Quantity": form.quantity,
      "Commodity Description": form.description,
      "COO Status": form.coo_status,
      "Compliance Score": packetScore?.overallScore ?? "",
      "Filing Status": form.filing_status,
      "Created Date": date,
    }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Shipment Summary");

    // Sheet 2 — Document Inventory
    const docRows = docs.length > 0
      ? docs.map((d, i) => ({
          "#": i + 1,
          "Document Type": d.docType.replace(/_/g, " "),
          "File Name": d.file.name,
          "File Size (KB)": Math.round(d.file.size / 1024),
          "Upload Date": date,
        }))
      : [{ Note: "No documents uploaded" }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(docRows), "Document Inventory");

    // Sheet 3 — Compliance Gaps
    const gaps = (packetScore?.topMissing || []).map((item: string, i: number) => ({
      "#": i + 1,
      "Missing Item": item,
      "Severity": i < 2 ? "Critical" : "High",
      "Status": "Missing",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gaps.length ? gaps : [{ Note: "No gaps" }]), "Compliance Gaps");

    // Sheet 4 — Filing Deadlines (placeholder based on form data)
    const deadlines: Record<string, string>[] = [];
    if (form.planned_departure) {
      const etd = new Date(form.planned_departure);
      const eta = form.estimated_arrival ? new Date(form.estimated_arrival) : new Date(etd.getTime() + 15 * 86400000);
      deadlines.push(
        { "Deadline": "ISF 10+2", "Date": new Date(etd.getTime() - 86400000).toISOString().slice(0, 10), "Status": "Upcoming", "Consequence": "$5,000 penalty per violation" },
        { "Deadline": "AES/EEI Filing", "Date": etd.toISOString().slice(0, 10), "Status": "Upcoming", "Consequence": "Cannot export without filing" },
        { "Deadline": "Customs Bond", "Date": new Date(eta.getTime() - 86400000).toISOString().slice(0, 10), "Status": "Upcoming", "Consequence": "Cargo held at port" },
        { "Deadline": "Customs Entry (CBP 7501)", "Date": new Date(eta.getTime() + 15 * 86400000).toISOString().slice(0, 10), "Status": "Upcoming", "Consequence": "General order warehouse" },
      );
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deadlines.length ? deadlines : [{ Note: "No deadlines (set ETD/ETA)" }]), "Filing Deadlines");

    XLSX.writeFile(wb, `Orchestra_${shipmentId}_${date}.xlsx`);
    toast({ title: "Export complete", description: `Shipment ${shipmentId} exported to Excel.` });
  };

  return (
    <Button size="sm" onClick={handleExport} className={`font-mono text-[10px] gap-1.5 bg-risk-low text-primary-foreground hover:bg-risk-low/90 ${className ?? ""}`}>
      <Download size={12} />
      Export to Excel
    </Button>
  );
}
