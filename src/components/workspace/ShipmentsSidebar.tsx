import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  ChevronDown,
  Ship,
  Plane,
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Pause,
  Clock,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

import type { ShipmentDeadline } from "@/lib/deadlineEngine";
import { getMostUrgentDeadline } from "@/lib/deadlineEngine";

export interface ShipmentListItem {
  shipment_id: string;
  description: string;
  mode: string;
  status: string;
  origin_country: string | null;
  destination_country: string | null;
  packet_score: number | null;
  filing_readiness: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewShipment: () => void;
  deadlines?: ShipmentDeadline[];
  onClickDeadline?: (d: ShipmentDeadline) => void;
}

const MODE_ICONS: Record<string, React.ReactNode> = {
  sea: <Ship size={11} className="shrink-0" />,
  air: <Plane size={11} className="shrink-0" />,
  land: <Truck size={11} className="shrink-0" />,
};

function getReadinessBadge(score: number | null, status: string) {
  const s = score ?? 0;

  if (status === "paused" || status === "waiting_docs") {
    return {
      icon: <Pause size={10} />,
      label: `${s}% — awaiting docs`,
      className: "bg-muted text-muted-foreground border-border",
    };
  }

  if (s >= 90) {
    return {
      icon: <CheckCircle2 size={10} />,
      label: `✓ ${s}% — Ready to file`,
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    };
  }

  if (s >= 50) {
    const issues = Math.ceil((100 - s) / 10);
    return {
      icon: <AlertTriangle size={10} />,
      label: `⚠ ${s}% — ${issues} issue${issues > 1 ? "s" : ""}`,
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    };
  }

  return {
    icon: <XCircle size={10} />,
    label: `✕ ${s}% — Incomplete`,
    className: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  };
}

type Section = "active" | "incomplete" | "completed";

const COMPLETED_STATUSES = ["cleared", "delivered", "closed", "archived"];
const PAUSED_STATUSES = ["paused", "waiting_docs", "draft"];

export function ShipmentsSidebar({ selectedId, onSelect, onNewShipment, deadlines = [], onClickDeadline }: Props) {
  const [expanded, setExpanded] = useState<Set<Section>>(new Set(["active"]));

  

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["shipments-sidebar-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select(
          "shipment_id, description, mode, status, origin_country, destination_country, packet_score, filing_readiness, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as ShipmentListItem[];
    },
  });

  const toggle = (section: Section) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };

  const active = shipments.filter((s) => !COMPLETED_STATUSES.includes(s.status) && !PAUSED_STATUSES.includes(s.status));
  const incomplete = shipments.filter((s) => PAUSED_STATUSES.includes(s.status));
  const completed = shipments.filter((s) => COMPLETED_STATUSES.includes(s.status));

  const sections: { key: Section; label: string; items: ShipmentListItem[]; defaultOpen: boolean }[] = [
    { key: "active", label: "Active", items: active, defaultOpen: true },
    { key: "incomplete", label: "Incomplete / Paused", items: incomplete, defaultOpen: false },
    { key: "completed", label: "Completed", items: completed, defaultOpen: false },
  ];

  const formatRoute = (s: ShipmentListItem) => {
    const origin = s.origin_country || "?";
    const dest = s.destination_country || "?";
    const desc = s.description?.slice(0, 30) || "No description";
    return `${desc}${s.description && s.description.length > 30 ? "…" : ""} · ${origin} → ${dest}`;
  };

  return (
    <div className="w-[320px] min-w-[320px] shrink-0 border-r border-border bg-card/50 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <h2 className="text-sm font-bold text-foreground">Shipments</h2>
        <Button size="sm" onClick={onNewShipment} className="h-7 px-2.5 text-[11px] font-semibold gap-1">
          <Plus size={12} /> New
        </Button>
      </div>

      {/* Shipment list */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {isLoading && (
            <div className="px-3 py-6 text-center">
              <p className="text-[11px] text-muted-foreground animate-pulse">Loading shipments…</p>
            </div>
          )}

          {!isLoading && shipments.length === 0 && (
            <div className="px-3 py-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground">No shipments yet</p>
              <Button size="sm" variant="outline" onClick={onNewShipment} className="text-[11px] gap-1">
                <Plus size={11} /> Create your first
              </Button>
            </div>
          )}

          {!isLoading &&
            sections.map(
              (section) =>
                section.items.length > 0 && (
                  <Collapsible
                    key={section.key}
                    open={expanded.has(section.key)}
                    onOpenChange={() => toggle(section.key)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors cursor-pointer">
                        <ChevronDown
                          size={12}
                          className={cn(
                            "text-muted-foreground transition-transform shrink-0",
                            expanded.has(section.key) && "rotate-180",
                          )}
                        />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">
                          {section.label}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {section.items.length}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-0.5 pb-1">
                        {section.items.map((s) => {
                          const badge = getReadinessBadge(s.packet_score, s.status);
                          const isSelected = selectedId === s.shipment_id;

                          return (
                            <div
                              key={s.shipment_id}
                              className={cn(
                                "w-full text-left px-3 py-2 transition-colors cursor-pointer",
                                "hover:bg-accent/40",
                                isSelected && "bg-primary/8 border-l-2 border-primary",
                              )}
                              onClick={() => onSelect(s.shipment_id)}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div className="flex items-center gap-1.5">
                                  {MODE_ICONS[s.mode] || <Ship size={11} />}
                                  <span
                                    style={{
                                      whiteSpace: "nowrap",
                                      fontWeight: 600,
                                      fontSize: "12px",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {s.shipment_id}
                                  </span>
                                </div>

                                <p
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontSize: "11px",
                                  }}
                                  className="text-muted-foreground mt-0.5 leading-snug"
                                >
                                  {formatRoute(s)}
                                </p>

                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 py-0 mt-1 inline-flex items-center gap-1",
                                    badge.className,
                                  )}
                                  style={{ whiteSpace: "nowrap", display: "inline-flex" }}
                                >
                                  {badge.icon} {badge.label}
                                </Badge>

                                {isSelected &&
                                  deadlines.length > 0 &&
                                  (() => {
                                    const urgent = getMostUrgentDeadline(deadlines);
                                    if (!urgent || urgent.status === "upcoming") return null;
                                    const isOver = urgent.status === "overdue";
                                    const isUrg = urgent.status === "urgent";
                                    return (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onClickDeadline?.(urgent);
                                        }}
                                        className={cn(
                                          "text-[9px] font-semibold px-1.5 py-0 rounded inline-flex items-center gap-0.5 mt-0.5",
                                          "border transition-colors active:scale-[0.97] cursor-pointer",
                                          isOver
                                            ? "bg-destructive/10 text-destructive border-destructive/20"
                                            : isUrg
                                              ? "bg-destructive/8 text-destructive border-destructive/20"
                                              : "bg-amber-500/10 text-amber-600 border-amber-500/20",
                                        )}
                                      >
                                        {(isOver || isUrg) && <AlertTriangle size={8} />}
                                        <Clock size={8} />
                                        {urgent.shortLabel}{" "}
                                        {isOver
                                          ? `${Math.abs(urgent.daysRemaining)}d over`
                                          : urgent.hoursRemaining < 48
                                            ? `in ${urgent.hoursRemaining}h`
                                            : `in ${urgent.daysRemaining}d`}
                                      </button>
                                    );
                                  })()}

                                {section.key === "incomplete" && (
                                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                                    Last active: {new Date(s.updated_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ),
            )}
        </div>
      </ScrollArea>
    </div>
  );
}
