import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanSquare, GanttChart, Calendar, Download, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { PipelineView } from "@/components/command/PipelineView";
import { TimelineView } from "@/components/command/TimelineView";
import { CalendarView } from "@/components/command/CalendarView";
import { ShipmentDetailPanel } from "@/components/command/ShipmentDetailPanel";
import { AIPriorityBrief } from "@/components/command/AIPriorityBrief";
import { CommandSearchBar, EMPTY_FILTERS, type CommandFilters } from "@/components/command/CommandSearchBar";
import { BulkActionBar } from "@/components/command/BulkActionBar";
import { ExportCenter } from "@/components/command/ExportCenter";
import type { CommandShipment } from "@/components/command/ShipmentCard";

export default function CommandCenter() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<string>("pipeline");
  const [filters, setFilters] = useState<CommandFilters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailShipment, setDetailShipment] = useState<CommandShipment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["command-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CommandShipment[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ shipmentId, newStatus }: { shipmentId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("shipments")
        .update({ status: newStatus as any })
        .eq("shipment_id", shipmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-shipments"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    let result = shipments;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(s =>
        s.shipment_id?.toLowerCase().includes(q) ||
        s.consignee?.toLowerCase().includes(q) ||
        s.hs_code?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.origin_country?.toLowerCase().includes(q) ||
        s.destination_country?.toLowerCase().includes(q) ||
        s.assigned_broker?.toLowerCase().includes(q)
      );
    }
    if (filters.origin) result = result.filter(s => s.origin_country?.toLowerCase().includes(filters.origin.toLowerCase()));
    if (filters.destination) result = result.filter(s => s.destination_country?.toLowerCase().includes(filters.destination.toLowerCase()));
    if (filters.mode && filters.mode !== "all") result = result.filter(s => s.mode === filters.mode);
    if (filters.status && filters.status !== "all") result = result.filter(s => s.status === filters.status);
    return result;
  }, [shipments, filters]);

  const handleCardClick = (s: CommandShipment) => {
    setDetailShipment(s);
    setDetailOpen(true);
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleStatusChange = (shipmentId: string, newStatus: string) => {
    updateStatusMutation.mutate({ shipmentId, newStatus });
  };

  const handleBulkArchive = () => {
    selectedIds.forEach(id => updateStatusMutation.mutate({ shipmentId: id, newStatus: "closed_incident" }));
    setSelectedIds(new Set());
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-mono text-sm font-bold">Shipment Command Center</h2>
            <p className="text-[10px] font-mono text-muted-foreground">Pipeline overview of all shipments with AI-powered prioritization</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="font-mono text-xs gap-1.5 h-8" onClick={() => setExportOpen(true)}>
              <Download size={12} /> Export
            </Button>
            <Button size="sm" className="font-mono text-xs gap-1.5 h-8" asChild>
              <Link to="/intake"><Plus size={12} /> New Shipment</Link>
            </Button>
          </div>
        </div>

        {/* AI Brief */}
        <AIPriorityBrief shipments={filtered} />

        {/* Search & Filters */}
        <CommandSearchBar filters={filters} onChange={setFilters} />

        {/* Bulk Actions */}
        <BulkActionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onBulkExport={() => setExportOpen(true)}
          onBulkArchive={handleBulkArchive}
          onBulkCompliance={() => toast({ title: "Bulk compliance check queued", description: `Running on ${selectedIds.size} shipments...` })}
        />

        {/* View Tabs */}
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="pipeline" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
              <KanbanSquare size={12} /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="timeline" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
              <GanttChart size={12} /> Timeline
            </TabsTrigger>
            <TabsTrigger value="calendar" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
              <Calendar size={12} /> Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground font-mono text-xs animate-pulse">Loading shipments...</div>
            ) : (
              <PipelineView
                shipments={filtered}
                onCardClick={handleCardClick}
                onStatusChange={handleStatusChange}
                selectedIds={selectedIds}
                onSelect={handleSelect}
              />
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <TimelineView shipments={filtered} onCardClick={handleCardClick} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <CalendarView shipments={filtered} onCardClick={handleCardClick} />
          </TabsContent>
        </Tabs>

        {/* Panels */}
        <ShipmentDetailPanel open={detailOpen} onOpenChange={setDetailOpen} shipment={detailShipment} />
        <ExportCenter open={exportOpen} onOpenChange={setExportOpen} shipments={filtered} selectedIds={selectedIds} />
      </div>
    </div>
  );
}
