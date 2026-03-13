import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
  transform?: (value: any, row: any) => any;
}

export function exportToExcel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  sheetName = "Sheet1"
) {
  const rows = data.map(row =>
    columns.reduce((acc, col) => {
      const raw = row[col.key];
      acc[col.header] = col.transform ? col.transform(raw, row) : (raw ?? "");
      return acc;
    }, {} as Record<string, any>)
  );

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = columns.map(col => {
    const maxLen = Math.max(
      col.header.length,
      ...rows.map(r => String(r[col.header] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Common export schemas per module
export const SHIPMENT_COLUMNS: ExportColumn[] = [
  { header: "Shipment ID", key: "shipment_id" },
  { header: "Status", key: "status" },
  { header: "Mode", key: "mode" },
  { header: "Origin", key: "origin" },
  { header: "Destination", key: "destination" },
  { header: "Risk Score", key: "risk_score" },
  { header: "HS Code", key: "hs_code" },
  { header: "Declared Value", key: "declared_value" },
  { header: "Currency", key: "currency" },
  { header: "Weight (kg)", key: "weight_kg" },
  { header: "Created At", key: "created_at", transform: (v) => v ? new Date(v).toLocaleString() : "" },
  { header: "Updated At", key: "updated_at", transform: (v) => v ? new Date(v).toLocaleString() : "" },
];

export const COMPLIANCE_COLUMNS: ExportColumn[] = [
  { header: "Check ID", key: "id" },
  { header: "Shipment ID", key: "shipment_id" },
  { header: "Check Type", key: "check_type" },
  { header: "Status", key: "status" },
  { header: "Severity", key: "severity" },
  { header: "Checked At", key: "checked_at", transform: (v) => v ? new Date(v).toLocaleString() : "" },
  { header: "Resolved At", key: "resolved_at", transform: (v) => v ? new Date(v).toLocaleString() : "" },
];

export const AUDIT_COLUMNS: ExportColumn[] = [
  { header: "Record ID", key: "id" },
  { header: "Module", key: "module" },
  { header: "Action", key: "action_type" },
  { header: "Field Changed", key: "field_changed" },
  { header: "User", key: "user_name" },
  { header: "Role", key: "user_role" },
  { header: "Old Value", key: "old_value", transform: (v) => v ? JSON.stringify(v) : "" },
  { header: "New Value", key: "new_value", transform: (v) => v ? JSON.stringify(v) : "" },
  { header: "Reason", key: "reason" },
  { header: "Status", key: "status" },
  { header: "Created At", key: "created_at", transform: (v) => v ? new Date(v).toLocaleString() : "" },
];

export const CHECKPOINT_COLUMNS: ExportColumn[] = [
  { header: "Checkpoint ID", key: "id" },
  { header: "Shipment ID", key: "shipment_id" },
  { header: "Checkpoint Name", key: "checkpoint_name" },
  { header: "Type", key: "checkpoint_type" },
  { header: "Sequence", key: "sequence_number" },
  { header: "Status", key: "handoff_status" },
  { header: "Sender", key: "sender_name" },
  { header: "Receiver", key: "receiver_name" },
  { header: "Qty Expected", key: "quantity_expected" },
  { header: "Qty Received", key: "quantity_received" },
  { header: "Condition", key: "product_condition" },
  { header: "Incident", key: "incident_flag", transform: (v) => v ? "YES" : "No" },
  { header: "Planned Arrival", key: "planned_arrival", transform: (v) => v ? new Date(v).toLocaleString() : "" },
  { header: "Actual Arrival", key: "actual_arrival", transform: (v) => v ? new Date(v).toLocaleString() : "" },
  { header: "Created At", key: "created_at", transform: (v) => v ? new Date(v).toLocaleString() : "" },
];

export const DECISION_TWIN_COLUMNS: ExportColumn[] = [
  { header: "Twin ID", key: "id" },
  { header: "Shipment ID", key: "shipment_id" },
  { header: "Status", key: "status" },
  { header: "Readiness Score", key: "readiness_score" },
  { header: "Clearance Probability", key: "clearance_probability" },
  { header: "Delay Probability", key: "delay_probability" },
  { header: "Hold Probability", key: "hold_probability" },
  { header: "Confidence", key: "confidence" },
  { header: "Top Failure Point", key: "top_failure_point" },
  { header: "Explanation", key: "explanation" },
  { header: "Evaluated At", key: "evaluated_at", transform: (v) => v ? new Date(v).toLocaleString() : "" },
  { header: "Created At", key: "created_at", transform: (v) => v ? new Date(v).toLocaleString() : "" },
];

export const NOTIFICATION_COLUMNS: ExportColumn[] = [
  { header: "ID", key: "id" },
  { header: "Title", key: "title" },
  { header: "Body", key: "body" },
  { header: "Severity", key: "severity" },
  { header: "Event Type", key: "event_type" },
  { header: "Shipment ID", key: "shipment_id" },
  { header: "Read", key: "is_read", transform: (v) => v ? "Yes" : "No" },
  { header: "Created At", key: "created_at", transform: (v) => v ? new Date(v).toLocaleString() : "" },
];
